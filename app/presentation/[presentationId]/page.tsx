"use client"

import { Presentation } from '@/components/presentation'
import { auth } from '@/lib/firebase'
import { PresentationService, TPresentation } from '@/lib/services/PresentationService'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PresentationViewerProps {
    params: {
        presentationId: string
    }
}

export default function PresentationViewer({ params }: PresentationViewerProps) {
    const [presentation, setPresentation] = useState<TPresentation | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    
    useEffect(() => {
        const fetchPresentation = async () => {
            setIsLoading(true)
            setError(null)
            const presentationService = new PresentationService()
            try {
                await auth.authStateReady()
                const user = auth.currentUser
                console.log('user', user)
                if (!user) {
                    router.push('/login')
                    return
                }
                const fetchedPresentation = await presentationService.getAccessiblePresentation(params.presentationId, user.uid)
                if (!fetchedPresentation) {
                    setError('Presentation not found')
                } else {
                    setPresentation(fetchedPresentation)
                }
            } catch (error) {
                console.error('Error fetching presentation:', error)
                setError('Failed to load presentation')
            } finally {
                setIsLoading(false)
            }
        }

        fetchPresentation()
    }, [params.presentationId, router])

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (error) {
        return <div>{error}</div>
    }

    if (!presentation) {
        return null
    }

    return (
        <Presentation
            slides={presentation.slides.map(slide => slide.code)}
            title={presentation.title}
        />
    )
}
