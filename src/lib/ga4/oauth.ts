import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  
  // Debug log
  console.log('[GA4 OAuth] Environment check:', {
    clientId: clientId ? `${clientId.substring(0, 20)}...` : 'MISSING',
    clientSecret: clientSecret ? 'SET' : 'MISSING',
    redirectUri: redirectUri || 'MISSING',
  })
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthUrl(projectId: string): string {
  const oauth2Client = getOAuth2Client()
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // 항상 refresh token 받기 위해
    state: projectId, // project ID를 state로 전달
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

// 간단한 암호화 (실 운영에선 더 강력한 암호화 필요)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'default-key-change-me'

export function encryptToken(token: string): string {
  // Base64 인코딩 + 간단한 XOR (MVP용 - 운영에선 AES 등 사용)
  const buffer = Buffer.from(token)
  const key = Buffer.from(ENCRYPTION_KEY)
  const encrypted = Buffer.from(buffer.map((byte, i) => byte ^ key[i % key.length]))
  return encrypted.toString('base64')
}

export function decryptToken(encrypted: string): string {
  const buffer = Buffer.from(encrypted, 'base64')
  const key = Buffer.from(ENCRYPTION_KEY)
  const decrypted = Buffer.from(buffer.map((byte, i) => byte ^ key[i % key.length]))
  return decrypted.toString()
}
