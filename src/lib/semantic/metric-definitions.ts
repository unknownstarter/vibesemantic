/**
 * Semantic Layer - Metric Definitions
 * Auto-generates and manages metric definitions based on project profile
 */

import { createClient } from '@/lib/supabase/server'
import type {
  MetricDefinition,
  MetricDefinitionInsert,
  ProjectProfile,
  MetricCategory,
  MetricSourceType,
  MetricAggregation,
  MetricDataType,
} from '@/types/database'
import {
  getIndustryKPIs,
  matchGoalsToKPIs,
  type IndustryKPI,
} from '@/lib/templates/industry-kpis'
import {
  getCachedMetricDefinitions,
  invalidateMetricCache,
} from '@/lib/cache/metric-cache'

/**
 * Generate metric definitions for a project based on its profile
 */
export async function generateMetricDefinitions(
  projectId: string,
  profile: ProjectProfile
): Promise<MetricDefinition[]> {
  // 1. Get industry-specific KPIs
  const industryKPIs = getIndustryKPIs(profile.industry)

  // 2. Match project goals to boost relevant KPIs
  const matchedKPIs = matchGoalsToKPIs(profile.goals, industryKPIs)

  // 3. Convert to metric definitions
  const definitions = matchedKPIs.map(kpi =>
    convertKPIToDefinition(projectId, kpi, profile.goals)
  )

  // 4. Save to database
  const savedDefinitions = await saveMetricDefinitions(projectId, definitions)

  // 5. Invalidate cache
  invalidateMetricCache(projectId)

  return savedDefinitions
}

/**
 * Convert IndustryKPI to MetricDefinitionInsert
 */
function convertKPIToDefinition(
  projectId: string,
  kpi: IndustryKPI,
  goals?: string[]
): MetricDefinitionInsert {
  // Find which goal this KPI was matched to
  const matchedGoal = goals?.find(goal => {
    const normalizedGoal = goal.toLowerCase()
    return kpi.synonyms.some(syn => normalizedGoal.includes(syn.toLowerCase()))
  })

  return {
    project_id: projectId,
    name: kpi.name,
    display_name: kpi.displayName,
    description: kpi.description,
    category: kpi.category as MetricCategory,
    source_type: kpi.sourceType as MetricSourceType,
    formula: kpi.formula ?? null,
    dependencies: kpi.dependencies ?? null,
    aggregation: kpi.aggregation as MetricAggregation,
    data_type: kpi.dataType as MetricDataType,
    synonyms: kpi.synonyms,
    example_questions: kpi.exampleQuestions,
    priority: kpi.priority,
    is_from_profile: true,
    matched_goal: matchedGoal ?? null,
    is_active: true,
  }
}

/**
 * Save metric definitions to database
 */
async function saveMetricDefinitions(
  projectId: string,
  definitions: MetricDefinitionInsert[]
): Promise<MetricDefinition[]> {
  const supabase = await createClient()

  // Use upsert to handle existing definitions
  const { data, error } = await supabase
    .from('metric_definitions')
    .upsert(definitions, {
      onConflict: 'project_id,name',
      ignoreDuplicates: false,
    })
    .select()

  if (error) {
    console.error('[SemanticLayer] Failed to save metric definitions:', error)
    throw new Error(`Failed to save metric definitions: ${error.message}`)
  }

  return (data ?? []) as MetricDefinition[]
}

/**
 * Migrate existing project to have metric definitions
 * Safe to call multiple times - will skip if definitions exist
 */
export async function migrateExistingProject(
  projectId: string
): Promise<{ created: number; skipped: number }> {
  // Check if definitions already exist
  const existing = await getCachedMetricDefinitions(projectId)
  if (existing.length > 0) {
    return { created: 0, skipped: existing.length }
  }

  // Get project profile
  const project = await getProject(projectId)
  if (!project?.profile) {
    console.warn(`[SemanticLayer] Project ${projectId} has no profile, skipping migration`)
    return { created: 0, skipped: 0 }
  }

  // Generate definitions
  const definitions = await generateMetricDefinitions(
    projectId,
    project.profile as ProjectProfile
  )

  return { created: definitions.length, skipped: 0 }
}

/**
 * Get project by ID
 */
async function getProject(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, profile')
    .eq('id', projectId)
    .single()

  if (error) {
    console.error('[SemanticLayer] Failed to fetch project:', error)
    return null
  }

  return data
}

/**
 * Update metric definitions when project profile changes
 */
export async function syncMetricDefinitionsWithProfile(
  projectId: string,
  newProfile: ProjectProfile
): Promise<MetricDefinition[]> {
  const supabase = await createClient()

  // Deactivate old profile-based definitions
  await supabase
    .from('metric_definitions')
    .update({ is_active: false })
    .eq('project_id', projectId)
    .eq('is_from_profile', true)

  // Generate new definitions
  const definitions = await generateMetricDefinitions(projectId, newProfile)

  return definitions
}

/**
 * Format metric definitions for LLM prompt
 * Returns a concise string representation
 */
export function formatMetricsForPrompt(
  definitions: MetricDefinition[],
  maxCount = 10
): string {
  const prioritized = definitions
    .filter(d => d.is_active)
    .sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3))
    .slice(0, maxCount)

  if (prioritized.length === 0) {
    return '(정의된 메트릭 없음)'
  }

  const lines = prioritized.map(d => {
    const category = d.category ? ` [${d.category}]` : ''
    return `- ${d.display_name}: ${d.description || d.name}${category}`
  })

  return lines.join('\n')
}

/**
 * Get metric definition by name
 */
export async function getMetricByName(
  projectId: string,
  name: string
): Promise<MetricDefinition | null> {
  const definitions = await getCachedMetricDefinitions(projectId)
  return definitions.find(d => d.name === name) ?? null
}

/**
 * Get metrics by category
 */
export async function getMetricsByCategory(
  projectId: string,
  category: MetricCategory
): Promise<MetricDefinition[]> {
  const definitions = await getCachedMetricDefinitions(projectId)
  return definitions.filter(d => d.category === category)
}

/**
 * Search metrics by synonym or display name
 */
export async function searchMetrics(
  projectId: string,
  query: string
): Promise<MetricDefinition[]> {
  const definitions = await getCachedMetricDefinitions(projectId)
  const normalizedQuery = query.toLowerCase()

  return definitions.filter(d => {
    // Match display name
    if (d.display_name.toLowerCase().includes(normalizedQuery)) {
      return true
    }
    // Match synonyms
    if (d.synonyms?.some(syn => syn.toLowerCase().includes(normalizedQuery))) {
      return true
    }
    // Match name
    if (d.name.toLowerCase().includes(normalizedQuery)) {
      return true
    }
    return false
  })
}

/**
 * Add a custom metric definition
 */
export async function addCustomMetric(
  projectId: string,
  metric: Omit<MetricDefinitionInsert, 'project_id' | 'is_from_profile'>
): Promise<MetricDefinition> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('metric_definitions')
    .insert({
      ...metric,
      project_id: projectId,
      is_from_profile: false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add custom metric: ${error.message}`)
  }

  // Invalidate cache
  invalidateMetricCache(projectId)

  return data as MetricDefinition
}

/**
 * Deactivate a metric
 */
export async function deactivateMetric(
  projectId: string,
  metricName: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('metric_definitions')
    .update({ is_active: false })
    .eq('project_id', projectId)
    .eq('name', metricName)

  if (error) {
    throw new Error(`Failed to deactivate metric: ${error.message}`)
  }

  // Invalidate cache
  invalidateMetricCache(projectId)
}

/**
 * Reactivate a metric
 */
export async function reactivateMetric(
  projectId: string,
  metricName: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('metric_definitions')
    .update({ is_active: true })
    .eq('project_id', projectId)
    .eq('name', metricName)

  if (error) {
    throw new Error(`Failed to reactivate metric: ${error.message}`)
  }

  // Invalidate cache
  invalidateMetricCache(projectId)
}

/**
 * Update metric priority
 */
export async function updateMetricPriority(
  projectId: string,
  metricName: string,
  priority: number
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('metric_definitions')
    .update({ priority })
    .eq('project_id', projectId)
    .eq('name', metricName)

  if (error) {
    throw new Error(`Failed to update metric priority: ${error.message}`)
  }

  // Invalidate cache
  invalidateMetricCache(projectId)
}
