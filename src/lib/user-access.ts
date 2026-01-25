/**
 * User Access Control Utilities
 * Checks user permissions for project creation and access
 */

import { createClient } from '@/lib/supabase/server'

export type AccessLevel = 'pending' | 'approved' | 'rejected'

export interface UserProfile {
  id: string
  user_id: string
  access_level: AccessLevel
  requested_at: string | null
  approved_at: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Get user's access level
 */
export async function getUserAccessLevel(userId: string): Promise<AccessLevel> {
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('access_level')
    .eq('user_id', userId)
    .single()

  return profile?.access_level || 'pending'
}

/**
 * Check if user has approved access
 */
export async function hasApprovedAccess(userId: string): Promise<boolean> {
  const accessLevel = await getUserAccessLevel(userId)
  return accessLevel === 'approved'
}

/**
 * Request access (update profile to pending if not already requested)
 */
export async function requestAccess(userId: string): Promise<void> {
  const supabase = await createClient()
  
  // Check if profile exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, access_level')
    .eq('user_id', userId)
    .single()

  if (existing) {
    // Update to pending if not already pending
    if (existing.access_level !== 'pending') {
      await supabase
        .from('user_profiles')
        .update({ 
          access_level: 'pending',
          requested_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    }
  } else {
    // Create new profile
    await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        access_level: 'pending',
      })
  }
}
