/**
 * Migration Script: Generate metric definitions for existing projects
 * 
 * This script calls the API endpoint to migrate metric definitions.
 * 
 * Usage:
 *   npx tsx scripts/migrate-metric-definitions.ts
 * 
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL or API_URL - API base URL (default: http://localhost:3000)
 *   API_TOKEN - Optional authentication token if API requires it
 *   DRY_RUN - Set to 'true' to preview without making changes
 */

async function callMigrationAPI(): Promise<void> {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/supabase', '') || 'http://localhost:3000'
  const apiToken = process.env.API_TOKEN
  const dryRun = process.env.DRY_RUN === 'true'

  const url = `${apiUrl}/api/projects/migrate-metrics`

  console.log('='.repeat(60))
  console.log('Metric Definitions Migration')
  console.log('='.repeat(60))
  console.log(`API URL: ${url}`)
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - Preview only')
    console.log('')
    console.log('To perform actual migration, run without DRY_RUN=true')
    return
  }
  console.log('')

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const result = await response.json()

    console.log('Migration Results:')
    console.log('')
    console.log(`  Total projects: ${result.total}`)
    console.log(`  Definitions created: ${result.created}`)
    console.log(`  Projects skipped: ${result.skipped}`)
    console.log('')
    
    if (result.results && result.results.length > 0) {
      console.log('Per-project details:')
      result.results.forEach((r: any) => {
        if (r.error) {
          console.log(`  ❌ ${r.projectName}: ${r.error}`)
        } else {
          console.log(`  ✅ ${r.projectName}: Created ${r.created}, Skipped ${r.skipped}`)
        }
      })
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('Migration completed successfully!')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('')
    console.error('Migration failed:')
    console.error(error instanceof Error ? error.message : error)
    console.error('')
    console.error('Make sure:')
    console.error('  1. The Next.js server is running (npm run dev)')
    console.error('  2. You have proper authentication (if required)')
    console.error('  3. The API endpoint is accessible')
    process.exit(1)
  }
}

async function main() {
  await callMigrationAPI()
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
