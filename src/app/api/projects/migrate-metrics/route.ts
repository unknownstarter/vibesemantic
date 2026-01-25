/**
 * API Endpoint: Migrate metric definitions for existing projects
 * 
 * This endpoint can be called to generate metric definitions for all projects
 * that have profiles but don't have metric definitions yet.
 * 
 * Usage:
 *   POST /api/projects/migrate-metrics
 *   Headers: Authorization required (admin/service role)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { migrateExistingProject } from '@/lib/semantic/metric-definitions'
import type { ProjectProfile } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient()

    // Get all projects with profiles
    const { data: projects, error } = await serviceClient
      .from('projects')
      .select('id, name, profile')
      .not('profile', 'is', null)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch projects: ${error.message}` },
        { status: 500 }
      )
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: 'No projects with profiles found',
        total: 0,
        created: 0,
        skipped: 0,
      })
    }

    let totalCreated = 0
    let totalSkipped = 0
    const results: Array<{
      projectId: string
      projectName: string
      created: number
      skipped: number
      error?: string
    }> = []

    for (const project of projects) {
      const profile = project.profile as ProjectProfile | null
      
      if (!profile) {
        results.push({
          projectId: project.id,
          projectName: project.name,
          created: 0,
          skipped: 0,
          error: 'No profile data',
        })
        continue
      }

      try {
        const result = await migrateExistingProject(project.id)
        totalCreated += result.created
        totalSkipped += result.skipped
        
        results.push({
          projectId: project.id,
          projectName: project.name,
          created: result.created,
          skipped: result.skipped,
        })
      } catch (err) {
        results.push({
          projectId: project.id,
          projectName: project.name,
          created: 0,
          skipped: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      total: projects.length,
      created: totalCreated,
      skipped: totalSkipped,
      results,
    })
  } catch (error) {
    console.error('[MigrateMetrics] Fatal error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Migration failed',
      },
      { status: 500 }
    )
  }
}
