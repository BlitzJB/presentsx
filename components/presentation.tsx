'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sandbox } from './Sandbox'

interface PresentationProps {
  slides: string[]
  title: string
}

export function Presentation({ slides, title }: PresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const presentationRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      presentationRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isFullscreen) {
        setShowControls(false)
      }
    }, 3000)
  }, [isFullscreen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        prevSlide()
      } else if (event.key === 'ArrowRight') {
        nextSlide()
      } else if (event.key === 'f') {
        toggleFullscreen()
      }
      showControlsTemporarily()
    }

    const handleMouseMove = () => {
      showControlsTemporarily()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [nextSlide, prevSlide, toggleFullscreen, showControlsTemporarily])

  const CurrentSlideComponent = slides[currentSlide]

  return (
    <div 
      ref={presentationRef} 
      className={`relative w-screen h-screen bg-white overflow-hidden ${isFullscreen ? 'cursor-none' : ''}`}
    >
      {/* Top bar */}
      <div 
        className={`absolute top-0 left-0 right-0 h-8 bg-gray-800 text-white flex items-center justify-between px-2 z-20 transition-opacity duration-300 ${
          isFullscreen && !showControls ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <h1 className="text-sm font-semibold truncate">{title}</h1>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-6 px-2">
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
        </Button>
      </div>

      {/* Slide content */}
      <div className="absolute inset-0 pt-8 pb-12">
        <Sandbox componentString={slides[currentSlide]} />
      </div>

      {/* Navigation buttons */}
      <Button
        variant="outline"
        size="icon"
        className={`absolute top-1/2 left-2 transform -translate-y-1/2 z-10 transition-opacity duration-300 ${
          isFullscreen && !showControls ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={prevSlide}
        disabled={currentSlide === 0}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={`absolute top-1/2 right-2 transform -translate-y-1/2 z-10 transition-opacity duration-300 ${
          isFullscreen && !showControls ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={nextSlide}
        disabled={currentSlide === slides.length - 1}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>

      {/* Bottom bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-12 bg-gray-100 flex items-center justify-between px-2 z-20 transition-opacity duration-300 ${
          isFullscreen && !showControls ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex space-x-1">
          {slides.map((_, index) => (
            <Button
              key={index}
              variant="outline"
              size="icon"
              className={`w-2 h-2 p-0 rounded-full ${
                index === currentSlide ? 'bg-primary' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentSlide(index)}
            >
              <span className="sr-only">Go to slide {index + 1}</span>
            </Button>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          {currentSlide === slides.length - 1 ? (
            'End of presentation'
          ) : (
            `Slide ${currentSlide + 1} of ${slides.length}`
          )}
        </div>
      </div>
    </div>
  )
}
