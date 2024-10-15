'use client'

import { useAuth } from './AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return <div>Loading...</div>
  }

  return <>{children}</>
}

export default ProtectedRoute
