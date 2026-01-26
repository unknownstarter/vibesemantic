import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireProjectMember, canEdit } from '@/lib/supabase/auth-helpers'
import { probeSchema } from '@/lib/csv/probe'
import type { Json, ProjectProfile, WorkspacePurpose } from '@/types/database'

type RouteParams = { params: Promise<{ projectId: string; datasetId: string }> }

// POST: Run schema probe on dataset
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId: projectSlugOrId, datasetId } = await params

  const auth = await requireAuth()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await requireProjectMember(projectSlugOrId)
  if (membership.error || !membership.projectId) {
    return NextResponse.json({ error: membership.error }, { status: 403 })
  }

  const projectId = membership.projectId

  if (!canEdit(membership.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const language = body.language || 'ko'
  const fileId = body.fileId // Optional: specific file to probe

  const supabase = createServiceClient()

  // Get dataset with purpose
  const { data: dataset, error: datasetError } = await supabase
    .from('csv_datasets')
    .select('id, status, purpose')
    .eq('id', datasetId)
    .eq('project_id', projectId)
    .single()

  if (datasetError || !dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  // Use dataset's purpose (single purpose for this specific data source)
  const datasetPurpose = (dataset.purpose as WorkspacePurpose | null) || 'product'

  // Get file to probe (specific or first active file) - need storage_path for full analysis
  let fileQuery = supabase
    .from('csv_files')
    .select('id, headers, sample_rows, storage_path, row_count')
    .eq('dataset_id', datasetId)
    .eq('is_active', true)

  if (fileId) {
    fileQuery = fileQuery.eq('id', fileId)
  }

  const { data: files, error: filesError } = await fileQuery
    .order('created_at', { ascending: true })
    .limit(1)

  if (filesError || !files || files.length === 0) {
    return NextResponse.json({ error: 'No files found in dataset' }, { status: 400 })
  }

  const file = files[0]
  const headers = file.headers as string[]
  const sampleRows = file.sample_rows as string[][]

  if (!headers || headers.length === 0) {
    return NextResponse.json({ error: 'File has no headers' }, { status: 400 })
  }

  // Fetch project profile for context-aware probing
  const { data: project } = await supabase
    .from('projects')
    .select('profile')
    .eq('id', projectId)
    .single()

  const projectProfile = project?.profile as ProjectProfile | null

  // Use dataset's purpose (this is the key: each data source has its own purpose)
  // This allows the same CSV to be interpreted differently based on why it was added

  // Download full file for comprehensive analysis (if not too large)
  let fullRows: string[][] = []
  const rowCount = file.row_count as number || 0
  const shouldAnalyzeFull = rowCount > 0 && rowCount <= 10000 // Analyze full file if <= 10k rows

  if (shouldAnalyzeFull && file.storage_path) {
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('csv-uploads')
        .download(file.storage_path)

      if (!downloadError && fileData) {
        const { parseCsvFull } = await import('@/lib/csv/parser')
        const content = await fileData.text()
        const parseResult = parseCsvFull(content)
        fullRows = parseResult.rows
        console.log(`[Probe] Analyzing full file: ${fullRows.length} rows`)
      }
    } catch (error) {
      console.warn('[Probe] Failed to load full file, using sample:', error)
      // Fallback to sample rows
      fullRows = sampleRows
    }
  } else {
    // Use sample rows for large files
    fullRows = sampleRows
    console.log(`[Probe] Using sample rows (${sampleRows.length} rows) - file has ${rowCount} total rows`)
  }

  // Update dataset status to probing
  await supabase
    .from('csv_datasets')
    .update({ status: 'probing' })
    .eq('id', datasetId)

  try {
    // Get full CSV content for Pandas profiling (if available)
    let fullCsvContent: string | undefined
    if (shouldAnalyzeFull && file.storage_path) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('csv-uploads')
          .download(file.storage_path)

        if (!downloadError && fileData) {
          fullCsvContent = await fileData.text()
        }
      } catch (error) {
        console.warn('[Probe] Failed to load full file for Pandas profiling:', error)
      }
    }

    // Run LLM probe with project context and dataset purpose
    // The dataset purpose determines which metrics are prioritized
    const probeResult = await probeSchema(
      headers, 
      fullRows, // Use full data analysis instead of just sample
      language, 
      projectProfile ?? undefined,
      [datasetPurpose], // Pass dataset's purpose for context-aware recommendations
      fullCsvContent // Optional: full CSV content for Pandas profiling
    )

    // Create or update source_mappings
    const mappingData = {
      project_id: projectId,
      status: 'draft' as const,
      date_column: probeResult.dateColumn,
      metric_columns: probeResult.metricColumns as unknown as Json,
      dimension_columns: probeResult.dimensionColumns as unknown as Json,
      aggregation_rules: probeResult.aggregationRules as unknown as Json,
      llm_questions: probeResult.llmQuestions as unknown as Json,
    }

    // Check if mapping exists for this dataset
    const { data: existingMapping } = await supabase
      .from('source_mappings')
      .select('id')
      .eq('project_id', projectId)
      .single()

    let mappingId: string

    if (existingMapping) {
      // Update existing mapping
      const { data: updatedMapping, error: updateError } = await supabase
        .from('source_mappings')
        .update(mappingData)
        .eq('id', existingMapping.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      mappingId = updatedMapping.id
    } else {
      // Create new mapping
      const { data: newMapping, error: insertError } = await supabase
        .from('source_mappings')
        .insert(mappingData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      mappingId = newMapping.id
    }

    // Link mapping to dataset
    await supabase
      .from('csv_datasets')
      .update({ mapping_id: mappingId })
      .eq('id', datasetId)

    return NextResponse.json({
      mapping: {
        id: mappingId,
        ...probeResult,
      },
    })
  } catch (error) {
    console.error('Probe error:', error)

    // Revert status on error
    await supabase
      .from('csv_datasets')
      .update({ status: 'error' })
      .eq('id', datasetId)

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Probe failed',
    }, { status: 500 })
  }
}
