export type Telemetry = {
  users: {
    total: number
    active: number
    disabled: number
    live: number
    new_24h: number
    new_7d: number
    new_30d: number
  }
  community: {
    total: number
    total_members: number
  }
  calls: {
    active: number
    total_seconds: number
  }
}

export type DailyCallStat = {
  date: string
  total_seconds: number
}

export type DailyCallStatsResponse = {
  stats: DailyCallStat[]
  days: number
}

export type ReferralAnalytics = {
  sources: Record<string, number>
}

export type WindowedCount = {
  total: number
  last_24h: number
  last_7d: number
  last_30d: number
}

export type EngagementMetrics = {
  onboarded: WindowedCount
  verified: WindowedCount
  matches: WindowedCount
  swipes: WindowedCount
  sessions: WindowedCount
  avg_engagement_seconds: WindowedCount
}

export type FirebaseMetrics = {
  sessions: WindowedCount
  active_users: WindowedCount
  avg_session_duration_seconds: WindowedCount
  events: Record<string, WindowedCount>
}

export type AdminUser = {
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_banned: boolean
  created_at: string
  phone_number: string
  phone_verified: boolean
  work_email: string
  work_email_verified: boolean
  college: string
  college_course: string
  graduation_year?: number
  age: number
  gender: string
  headline: string
  bio: string
  is_onboarding_complete: boolean
  account_state: string
  last_login_at?: string
  linkedin_url: string
  instagram_handle: string
  twitter_handle: string
  role: string
  referral_source: string
  referral_ref_by: string
}

export type AdminUsersPage = {
  users: AdminUser[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type LiveUserEntry = {
  username: string
  last_seen: number
  email?: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  is_banned?: boolean
}

export type LiveUsersPage = {
  users: LiveUserEntry[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type AdminCommunity = {
  id: number
  slug: string
  name: string
  description: string
  icon: string
  type: string
  is_private: boolean
  created_by: string
  member_count: number
  created_at: string
}

export type AdminCommunitiesPage = {
  communities: AdminCommunity[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type PendingCommunity = {
  id: number
  slug: string
  name: string
  description: string
  icon: string
  type: string
  isPrivate: boolean
  requiresApproval: boolean
  adminOnlyPosts: boolean
  inviteToken?: string
  createdBy: string
  memberCount: number
  createdAt: string
  updatedAt: string
  status: string
  ownerEmail: string
  ownerFirstName: string
}

export type AdminEvent = {
  id: number
  community_id: number
  community_name: string
  community_slug: string
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
  created_by: string
  attendee_count: number
  created_at: string
}

export type AdminEventsPage = {
  events: AdminEvent[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export type WorkEmailReviewRequest = {
  id: number
  username: string
  workEmail: string
  domain: string
  status: string
  reviewedBy: string
  reviewedAt: string | null
  createdAt: string
  user_profile?: {
    email: string
    first_name: string
    last_name: string
    college: string
    college_course: string
    graduation_year?: number
    age: number
    gender: string
    headline: string
    bio: string
    linkedin_url: string
    instagram_handle: string
    twitter_handle: string
    is_active: boolean
    account_state: string
    created_at: string
  }
}

export type UserReport = {
  id: number
  reporterUsername: string
  reportedUsername: string
  reason: string
  notes: string
  status: string
  adminNotes: string
  createdAt: string
  updatedAt: string
}

export type UserReportsPage = {
  reports: UserReport[]
  total: number
  limit: number
  offset: number
}

export type DeletionRequest = {
  id: number
  username: string
  requestType: string
  breakDurationDays?: number
  status: string
  adminNotes: string
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: string
}

export type DeletionRequestsPage = {
  requests: DeletionRequest[]
  total: number
  limit: number
  offset: number
}

export type Maintainer = {
  id: number
  username: string
  display_name: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  colleges: string[]
}

export type FeatureFlags = {
  chatEditEnabled: boolean
  chatDeleteEnabled: boolean
  chatReplyEnabled: boolean
  callRecordsEnabled: boolean
  accountDeletionEnabled: boolean
}

export type VersionConfig = {
  latest_version: string
  min_supported_version: string
  force_update: boolean
  maintenance_mode: boolean
  ios_update_url: string
  android_update_url: string
  featureFlags: FeatureFlags
  workEmailOpen: boolean
}

export type LogResponse = {
  log: string
  file: string
  lines: string[]
}

export type LogBackup = {
  file: string
  size_bytes: number
  created_at: string
}

export type LogBackupsResponse = {
  log: string
  backups: LogBackup[]
}

export type LogType = "server" | "auth" | "error"
