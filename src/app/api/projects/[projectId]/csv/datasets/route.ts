import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireProjectMember } from '@/lib/supabase/auth-helpers'

// GET: List all datasets for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const auth = await requireAuth()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await requireProjectMember(projectId)
  if (membership.error) {
    return NextResponse.json({ error: membership.error }, { status: 403 })
  }

  const supabase = await createClient()

  const { data: datasets, error } = await supabase
    .from('csv_datasets')
    .select(`
      *,
      csv_files(id, original_filename, status, is_active),
      source_mappings(id, status)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ datasets })
}

// POST: Create a new dataset
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const auth = await requireAuth()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await requireProjectMember(projectId)
  if (membership.error) {
    return NextResponse.json({ error: membership.error }, { status: 403 })
  }

  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Dataset name is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: dataset, error } = await supabase
    .from('csv_datasets')
    .insert({
      project_id: projectId,
      name: name.trim(),
      status: 'draft',
      created_by: auth.user!.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dataset }, { status: 201 })
}
