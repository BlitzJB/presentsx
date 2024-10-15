'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { PresentationService, TPresentation, TSlide } from '@/lib/services/PresentationService'
import { useAuth } from '@/components/AuthContext'
import { PresentationBuilder } from '@/components/presentation-builder'
import ProtectedRoute from '@/components/ProtectedRoute'
import { v4 as uuidv4 } from 'uuid'

export default function PresentationEditPage() {
    const { presentationId } = useParams()
    const { user } = useAuth()
    const [presentation, setPresentation] = useState<TPresentation | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const presentationService = new PresentationService()

    useEffect(() => {
        if (user && presentationId) {
            fetchPresentation()
        }
    }, [user, presentationId])

    const fetchPresentation = async () => {
        setIsLoading(true)
        try {
            let fetchedPresentation = await presentationService.getPresentation(presentationId as string)
            if (fetchedPresentation) {
                // If there are no slides, add a default slide
                if (fetchedPresentation.slides.length === 0) {
                    const defaultSlide: TSlide = {
                        id: Date.now().toString(),
                        code: `function Component() { 
  return (
    <>
      <div>New Slide</div> 
    </>
  )
}`
                    }
                    await presentationService.addSlide(fetchedPresentation.id, defaultSlide)
                    fetchedPresentation = {
                        ...fetchedPresentation,
                        slides: [defaultSlide]
                    }
                }
                setPresentation(fetchedPresentation)
            }
        } catch (error) {
            console.error('Error fetching presentation:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const updateSlideDebounced = useDebouncedCallback(async (slideId: string, updatedSlide: Partial<TSlide>) => {
        if (presentation) {
            try {
                await presentationService.updateSlide(presentation.id, slideId, updatedSlide)
                await presentationService.updateTouched(presentation.id)
            } catch (error) {
                console.error('Error updating slide:', error)
            }
        }
    }, 1000)

    const updatePresentation = async (data: Partial<TPresentation>) => {
        if (presentation) {
            try {
                await presentationService.updatePresentation(presentation.id, data)
                await presentationService.updateTouched(presentation.id)
            } catch (error) {
                console.error('Error updating presentation:', error)
            }
        }
    }

    const addSlide = async () => {
        if (presentation) {
            try {
                const newSlide: TSlide = {
                    id: uuidv4(),
                    code: `function Component() { 
  return (
    <>
      <div>New Slide</div> 
    </>
  )
}`
                }
                await presentationService.addSlide(presentation.id, newSlide)
                await presentationService.updateTouched(presentation.id)
                return newSlide
            } catch (error) {
                console.error('Error adding slide:', error)
            }
        }
        return null
    }

    const removeSlide = async (slideId: string) => {
        if (presentation) {
            try {
                await presentationService.removeSlide(presentation.id, slideId)
                await presentationService.updateTouched(presentation.id)
            } catch (error) {
                console.error('Error removing slide:', error)
            }
        }
    }

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (!presentation) {
        return <div>Presentation not found</div>
    }

    return (
        <ProtectedRoute>
            <PresentationBuilder
                presentation={presentation}
                updateSlide={updateSlideDebounced}
                updatePresentation={updatePresentation}
                addSlide={addSlide}
                removeSlide={removeSlide}
            />
        </ProtectedRoute>
    )
}
