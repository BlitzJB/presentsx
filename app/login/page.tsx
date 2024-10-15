 'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'

export default function Login() {
  const [error, setError] = useState('')
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push('/')
    } catch (error) {
      setError('Failed to sign in with Google')
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Login</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <Button onClick={handleGoogleSignIn}>Sign in with Google</Button>
    </div>
  )
}