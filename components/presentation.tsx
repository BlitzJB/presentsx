'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Minimize, UserPlus, Copy, Share2, Check, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sandbox } from './Sandbox'
import Peer, { DataConnection } from 'peerjs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/use-toast'
import { Toaster } from 'react-hot-toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface PresentationProps {
  slides: string[]
  title: string
  presentationId: string
}

export function Presentation({ slides, title, presentationId }: PresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const presentationRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isPeerReady, setIsPeerReady] = useState(false)
  const [peerId, setPeerId] = useState<string>('')
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false)
  const [isPeerIdModalOpen, setIsPeerIdModalOpen] = useState(false)
  const peerRef = useRef<Peer | null>(null)
  const connectionRef = useRef<DataConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [showPeerId, setShowPeerId] = useState(false)
  const [controllerLink, setControllerLink] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const { toast } = useToast()
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [shareFeedback, setShareFeedback] = useState(false)
  const [isPeerInitiated, setIsPeerInitiated] = useState(false)

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

  const initializePeerConnection = useCallback(async () => {
    console.log('Initializing peer connection')
    setIsPeerInitiated(true)
    const randomId = Math.random().toString(36).substring(2, 15)
    const peer = new Peer(`presenter-${randomId}`, {
      host: 'localhost',
      port: 8000,
      path: '/myapp'
    })
    
    peer.on('open', (id) => {
      console.log('Presenter ID is: ' + id)
      setPeerId(id)
      setIsPeerReady(true)
      const link = `${window.location.origin}/presentation/${presentationId}/controller/${id}`
      setControllerLink(link)
      setIsPeerIdModalOpen(true)
    })

    peer.on('connection', (conn) => {
      console.log('Controller connected')
      connectionRef.current = conn
      setIsConnected(true)
      setupDataConnection(conn)
      if (localStreamRef.current) {
        callController(conn.peer)
      }
    })

    peer.on('error', (err) => {
      console.error('Peer error:', err)
      setIsConnected(false)
    })

    peerRef.current = peer

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      console.log('Got local stream for screen sharing')
      localStreamRef.current = stream

      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing ended')
        localStreamRef.current = null
      }
    } catch (err) {
      console.error('Error getting display media:', err)
    }
  }, [presentationId])

  const setupDataConnection = (conn: DataConnection) => {
    conn.on('data', (data: unknown) => {
      console.log('Received data:', data)
      if (typeof data === 'string') {
        if (data === 'next') nextSlide()
        else if (data === 'prev') prevSlide()
      }
    })

    conn.on('close', () => {
      console.log('Connection closed')
      setIsConnected(false)
    })
  }

  const callController = (controllerId: string) => {
    if (peerRef.current && localStreamRef.current) {
      const call = peerRef.current.call(controllerId, localStreamRef.current)
      call.on('error', (err) => {
        console.error('Call error:', err)
      })
      console.log('Started call to controller')
    }
  }

  const handleAddController = () => {
    setIsInstructionModalOpen(true)
  }

  const handleConfirmScreenShare = () => {
    setIsInstructionModalOpen(false)
    initializePeerConnection()
  }

  useEffect(() => {
    if (isPeerReady && peerId) {
      setShowPeerId(true)
    }
  }, [isPeerReady, peerId])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(controllerLink)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
      toast({
        title: "Copied!",
        description: "The controller link has been copied to your clipboard.",
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({
        title: "Copy failed",
        description: "Unable to copy the link. Please try again.",
        variant: "destructive",
      })
    }
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Controller Link',
          text: 'Use this link to control the presentation:',
          url: controllerLink,
        })
        setShareFeedback(true)
        setTimeout(() => setShareFeedback(false), 2000)
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support the Web Share API. Please use the copy button instead.",
      })
    }
  }

  const showPeerIdModal = useCallback(() => {
    if (isPeerReady && peerId) {
      setIsPeerIdModalOpen(true)
    } else {
      toast({
        title: "Not ready",
        description: "Peer connection is not ready yet. Please try again in a moment.",
        variant: "destructive",
      })
    }
  }, [isPeerReady, peerId, toast])

  const getConnectionStatus = () => {
    if (!isPeerReady) return 'Initializing connection...'
    if (isConnected) return 'Connected to controller'
    return 'Waiting for controller...'
  }

  return (
    <div 
      ref={presentationRef} 
      className={`relative w-screen h-screen bg-white overflow-hidden ${isFullscreen ? 'cursor-none' : ''}`}
    >
      <Toaster />
      {/* Top bar */}
      <div 
        className={`absolute top-0 left-0 right-0 h-8 bg-gray-800 text-white flex items-center justify-between px-2 z-20 transition-opacity duration-300 ${
          isFullscreen && !showControls ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <h1 className="text-sm font-semibold truncate">{title}</h1>
        <div className="flex items-center space-x-2">
          {isPeerInitiated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <div 
                      className={`w-2 h-2 rounded-full mr-2 ${
                        !isPeerReady ? 'bg-yellow-500' :
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <Button variant="ghost" size="sm" onClick={showPeerIdModal} className="h-6 px-2">
                      <Link className="h-4 w-4" />
                      <span className="sr-only">Show Connection Info</span>
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getConnectionStatus()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="ghost" size="sm" onClick={handleAddController} className="h-6 px-2">
            <UserPlus className="h-4 w-4" />
            <span className="sr-only">Add Controller</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-6 px-2">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
          </Button>
        </div>
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

      {/* Instruction Modal */}
      <Dialog open={isInstructionModalOpen} onOpenChange={setIsInstructionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Screen Sharing Instructions</DialogTitle>
            <DialogDescription>
              When the screen sharing picker opens, please select the current tab to share your presentation.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleConfirmScreenShare}>Start Screen Sharing</Button>
        </DialogContent>
      </Dialog>

      {/* Peer ID Modal */}
      <Dialog open={isPeerIdModalOpen} onOpenChange={setIsPeerIdModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controller Connection Information</DialogTitle>
            <DialogDescription>
              Share this link or QR code with the controller to establish a connection:
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-100 p-2 rounded flex items-center justify-between">
            <a href={controllerLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-words text-wrap break-all flex-grow mr-2">
              {controllerLink}
            </a>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={copyToClipboard} className="transition-all duration-200">
                {copyFeedback ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy link</span>
              </Button>
              <Button variant="outline" size="icon" onClick={shareLink} className="transition-all duration-200">
                {shareFeedback ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                <span className="sr-only">Share link</span>
              </Button>
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <QRCodeSVG value={controllerLink} size={200} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
