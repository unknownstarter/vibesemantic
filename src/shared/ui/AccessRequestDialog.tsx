'use client'

import { useState } from 'react'
import { Dialog } from '@/shared/ui/Dialog'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'

interface AccessRequestDialogProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
}

export function AccessRequestDialog({ isOpen, onClose, userEmail }: AccessRequestDialogProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleRequest = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '권한 요청에 실패했습니다')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 요청 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setSuccess(false)
      setError('')
      onClose()
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="접근 권한이 필요합니다">
      {success ? (
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">요청 완료</h3>
            <p className="text-muted text-sm">
              권한 요청이 접수되었습니다.<br />
              관리자 승인 후 프로젝트 생성 및 접근이 가능합니다.
            </p>
          </div>
          <Button onClick={handleClose} className="w-full">
            확인
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 mx-auto mb-4 bg-warning/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">접근 권한이 필요합니다</h3>
            <p className="text-muted text-sm mb-4">
              프로젝트를 생성하거나 접근하려면 관리자 승인이 필요합니다.<br />
              관리자({userEmail ? `hello@dropdown.xyz` : '관리자'})에게 권한 요청을 보내시겠습니까?
            </p>
            {userEmail && (
              <p className="text-xs text-subtle">
                요청자: {userEmail}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleRequest}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  요청 중...
                </span>
              ) : (
                '권한 요청하기'
              )}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
