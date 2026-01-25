import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireProjectMember } from '@/lib/supabase/auth-helpers'
import { parseCsvMetadata } from '@/lib/csv/parser'

type RouteParams = { params: Promise<{ projectId: string; datasetId: string }> }

// POST: Upload CSV file(s) to dataset
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

  const supabase = createServiceClient()

  // Verify dataset exists and belongs to project
  const { data: dataset, error: datasetError } = await supabase
    .from('csv_datasets')
    .select('id, status')
    .eq('id', datasetId)
    .eq('project_id', projectId)
    .single()

  if (datasetError || !dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  // Parse multipart form data
  const formData = await request.formData()
  const files = formData.getAll('files') as File[]

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const uploadedFiles = []

  for (const file of files) {
    // Validate file type
    const validTypes = ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel']
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      continue // Skip invalid files
    }

    // Read file content - only parse metadata for upload
    const content = await file.text()
    const parseResult = parseCsvMetadata(content)

    if (parseResult.headers.length === 0) {
      continue // Skip empty files
    }

    // Generate storage path
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${projectId}/${datasetId}/${timestamp}_${safeName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('csv-uploads')
      .upload(storagePath, file, {
        contentType: 'text/csv',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      continue
    }

    // Create csv_files record
    const { data: csvFile, error: insertError } = await supabase
      .from('csv_files')
      .insert({
        project_id: projectId,
        dataset_id: datasetId,
        original_filename: file.name,
        storage_path: storagePath,
        file_size_bytes: file.size,
        row_count: parseResult.totalRows,
        column_count: parseResult.columnCount,
        headers: parseResult.headers,
        sample_rows: parseResult.sampleRows.slice(0, 10), // Store first 10 rows
        status: 'ready',
        is_active: true,
        uploaded_by: auth.user!.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('DB insert error:', insertError)
      // Try to clean up uploaded file
      await supabase.storage.from('csv-uploads').remove([storagePath])
      continue
    }

    uploadedFiles.push(csvFile)
  }

  if (uploadedFiles.length === 0) {
    return NextResponse.json({ error: 'No valid CSV files were uploaded' }, { status: 400 })
  }

  // Update dataset status if it was draft
  if (dataset.status === 'draft') {
    await supabase
      .from('csv_datasets')
      .update({ status: 'draft' }) // Still draft until probe
      .eq('id', datasetId)
  }

  return NextResponse.json({
    files: uploadedFiles,
    count: uploadedFiles.length,
  }, { status: 201 })
}

// GET: List files in dataset
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  const supabase = createServiceClient()

  const { data: files, error } = await supabase
    .from('csv_files')
    .select('*')
    .eq('dataset_id', datasetId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ files })
}
