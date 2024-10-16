'use client'

import React, { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Minimize, UserPlus, Copy, Share2, Check, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sandbox } from './Sandbox'
import Peer, { DataConnection } from 'peerjs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '@/components/ui/use-toast'
import { Toaster } from 'react-hot-toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Presentation Component
 * 
 * This component manages the display and control of a presentation, including:
 * - Slide navigation
 * - Fullscreen mode
 * - Peer-to-peer connection for remote control
 * - Drawing capabilities
 * - Screen sharing
 * 
 * @component
 */
interface PresentationProps {
  slides: string[]  // Array of slide content strings
  title: string     // Presentation title
  presentationId: string  // Unique identifier for the presentation
}

export function Presentation({ slides, title, presentationId }: PresentationProps) {
  // State management for presentation controls
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const presentationRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Peer connection states
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

  // Drawing states
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingColor, setDrawingColor] = useState('red')
  const [drawingWidth, setDrawingWidth] = useState(3)
  const [isDrawingMode, setIsDrawingMode] = useState(false)

  // Virtual cursor for remote control
  const virtualCursorRef = useRef<HTMLDivElement>(null)

  /**
   * Advances to the next slide
   */
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
  }, [slides.length])

  /**
   * Moves to the previous slide
   */
  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }, [])

  /**
   * Toggles fullscreen mode
   */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      presentationRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  /**
   * Shows controls temporarily and hides them after a delay in fullscreen mode
   */
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

  // Effect for keyboard and mouse controls
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

  /**
   * Initializes the peer-to-peer connection for remote control
   */
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

    // Initialize screen sharing
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

  /**
   * Sets up the data connection with the controller
   */
  const setupDataConnection = (conn: DataConnection) => {
    conn.on('data', (data: unknown) => {
      console.log('Received data:', data)
      if (typeof data === 'object' && data !== null) {
        const { type } = data as { type: string }
        switch (type) {
          case 'mousemove':
            handleRemoteMouseMove(data as { x: number, y: number })
            break
          case 'mousedown':
          case 'mouseup':
            handleRemoteMouseClick(data as { x: number, y: number, button: number }, type)
            break
        }
      } else if (typeof data === 'string') {
        if (data === 'next') nextSlide()
        else if (data === 'prev') prevSlide()
      }
    })

    conn.on('close', () => {
      console.log('Connection closed')
      setIsConnected(false)
    })
  }

  /**
   * Initiates a call to the controller for screen sharing
   */
  const callController = (controllerId: string) => {
    if (peerRef.current && localStreamRef.current) {
      const call = peerRef.current.call(controllerId, localStreamRef.current)
      call.on('error', (err) => {
        console.error('Call error:', err)
      })
      console.log('Started call to controller')
    }
  }

  /**
   * Handles the "Add Controller" button click
   */
  const handleAddController = () => {
    setIsInstructionModalOpen(true)
  }

  /**
   * Confirms screen sharing and initializes peer connection
   */
  const handleConfirmScreenShare = () => {
    setIsInstructionModalOpen(false)
    initializePeerConnection()
  }

  // Effect to show peer ID when ready
  useEffect(() => {
    if (isPeerReady && peerId) {
      setShowPeerId(true)
    }
  }, [isPeerReady, peerId])

  /**
   * Copies the controller link to clipboard
   */
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

  /**
   * Shares the controller link using the Web Share API
   */
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

  /**
   * Shows the peer ID modal if the connection is ready
   */
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

  /**
   * Returns the current connection status
   */
  const getConnectionStatus = () => {
    if (!isPeerReady) return 'Initializing connection...'
    if (isConnected) return 'Connected to controller'
    return 'Waiting for controller...'
  }

  /**
   * Starts drawing on the canvas
   */
  const startDrawing = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
  }, [])

  /**
   * Continues drawing on the canvas as the mouse moves
   */
  const draw = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top)
    ctx.strokeStyle = drawingColor
    ctx.lineWidth = drawingWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [isDrawing, drawingColor, drawingWidth])

  /**
   * Stops drawing on the canvas
   */
  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  /**
   * Clears the canvas
   */
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  // Effect to resize canvas on window resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  /**
   * Toggles drawing mode
   */
  const toggleDrawingMode = useCallback(() => {
    setIsDrawingMode(prev => !prev)
    if (canvasRef.current) {
      canvasRef.current.style.pointerEvents = isDrawingMode ? 'none' : 'auto'
    }
  }, [isDrawingMode])

  /**
   * Handles remote mouse movement
   */
  const handleRemoteMouseMove = useCallback(({ x, y }: { x: number, y: number }) => {
    if (virtualCursorRef.current && presentationRef.current) {
      const presentationRect = presentationRef.current.getBoundingClientRect()

      // Calculate the absolute position within the presentation area
      const newX = x * presentationRect.width
      const newY = y * presentationRect.height

      virtualCursorRef.current.style.transform = `translate(${newX}px, ${newY}px)`
      virtualCursorRef.current.style.display = 'block' // Ensure the cursor is visible
    }
  }, [])

  /**
   * Handles remote mouse clicks
   */
  const handleRemoteMouseClick = useCallback((data: { x: number, y: number, button: number }, type: 'mousedown' | 'mouseup') => {
    if (presentationRef.current) {
      const presentationRect = presentationRef.current.getBoundingClientRect()
      const x = data.x * presentationRect.width
      const y = data.y * presentationRect.height

      // Create mousedown/mouseup event
      const mouseEvent = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: Math.round(presentationRect.left + x),
        clientY: Math.round(presentationRect.top + y),
        button: data.button,
      })

      // Find the element at the cursor position
      const elementAtPoint = document.elementFromPoint(presentationRect.left + x, presentationRect.top + y)

      if (elementAtPoint) {
        // Dispatch the mousedown/mouseup event
        elementAtPoint.dispatchEvent(mouseEvent)

        // If it's a mouseup event, dispatch a single click event
        if (type === 'mouseup') {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: Math.round(presentationRect.left + x),
            clientY: Math.round(presentationRect.top + y),
            button: data.button,
          })
          elementAtPoint.dispatchEvent(clickEvent)
        }
      }

      // Update virtual cursor appearance for mousedown/mouseup
      if (virtualCursorRef.current) {
        virtualCursorRef.current.style.transform = `translate(${x}px, ${y}px)`
        virtualCursorRef.current.style.backgroundColor = type === 'mousedown' ? 'blue' : 'red'
      }
    }
  }, [])

  // Effect to log virtual cursor position (for debugging)
  useEffect(() => {
    const logCursorPosition = () => {
      if (virtualCursorRef.current) {
        console.log('Virtual cursor position:', virtualCursorRef.current.style.transform)
      }
    }

    const interval = setInterval(logCursorPosition, 1000) // Log every second

    return () => clearInterval(interval)
  }, [])

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

      {/* Bottom bar with slide controls and drawing controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-12 bg-gray-100 flex items-center justify-between px-2 z-40 transition-opacity duration-300 ${
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

        {/* Drawing controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDrawingMode}
            className={`${isDrawingMode ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {isDrawingMode ? 'Exit Drawing' : 'Start Drawing'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDrawingColor('red')}
            className={`w-6 h-6 p-0 ${drawingColor === 'red' ? 'ring-2 ring-offset-2 ring-red-500' : ''}`}
            style={{ backgroundColor: 'red' }}
          >
            <span className="sr-only">Red</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDrawingColor('blue')}
            className={`w-6 h-6 p-0 ${drawingColor === 'blue' ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            style={{ backgroundColor: 'blue' }}
          >
            <span className="sr-only">Blue</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDrawingColor('green')}
            className={`w-6 h-6 p-0 ${drawingColor === 'green' ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}
            style={{ backgroundColor: 'green' }}
          >
            <span className="sr-only">Green</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
          >
            Clear
          </Button>
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

      {/* Canvas overlay for drawing */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-30 ${isDrawingMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
        onMouseDown={(e) => {
          if (isDrawingMode) {
            e.preventDefault()
            startDrawing(e)
          }
        }}
        onMouseMove={(e) => {
          if (isDrawingMode) {
            e.preventDefault()
            draw(e)
          }
        }}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />

      {/* Virtual cursor */}
      <div 
        ref={virtualCursorRef}
        className="absolute w-4 h-4 bg-red-500 rounded-full pointer-events-none z-50 transition-all duration-100"
        style={{ 
          left: 0, 
          top: 0, 
          transform: 'translate(0, 0)',
          display: 'none' // Initially hidden
        }}
      />
    </div>
  )
}
