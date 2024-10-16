'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MousePointer2 } from 'lucide-react'

interface ControllerComponentProps {
  presentationId: string
  presenterPeerId: string
}

function ControllerComponent({ presentationId, presenterPeerId }: ControllerComponentProps) {
    const [connected, setConnected] = useState(false)
    const [isReceivingStream, setIsReceivingStream] = useState(false)
    const [streamError, setStreamError] = useState<string | null>(null)
    const [isStreamReady, setIsStreamReady] = useState(false)
    const peerRef = useRef<Peer | null>(null)
    const connectionRef = useRef<DataConnection | null>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const remoteStreamRef = useRef<MediaStream | null>(null)
    const isMouseControlActive = useRef(false)

    useEffect(() => {
        const randomId = Math.random().toString(36).substr(2, 9)
        const peer = new Peer(`controller-${randomId}`, {
            host: 'localhost',
            port: 8000,
            path: '/myapp'
        })
        
        peer.on('open', () => {
            console.log('Controller peer created')
            connectToPresenter(peer)
        })

        peer.on('call', (call) => {
            console.log('Receiving call from presenter')
            call.answer()
            call.on('stream', (remoteStream) => {
                console.log('Received presenter stream', remoteStream)
                remoteStreamRef.current = remoteStream
                setIsStreamReady(true)
                setStreamError(null)
            })
        })

        peer.on('error', (err) => {
            console.error('Peer error:', err)
            setStreamError(`Peer error: ${err.message}`)
        })

        peerRef.current = peer

        return () => {
            peer.destroy()
        }
    }, [presentationId, presenterPeerId])

    const connectToPresenter = (peer: Peer) => {
        console.log('Connecting to presenter:', presenterPeerId)
        const conn = peer.connect(presenterPeerId)
        connectionRef.current = conn
        setupDataConnection(conn)
    }

    const setupDataConnection = (conn: DataConnection) => {
        conn.on('open', () => {
            console.log('Data connection established')
            setConnected(true)
        })
        conn.on('data', (data: unknown) => {
            console.log('Received data:', data)
        })
    }

    const sendMessage = (message: string) => {
        if (connectionRef.current) {
            connectionRef.current.send(message)
        }
    }

    const handleStartViewing = () => {
        if (remoteVideoRef.current && remoteStreamRef.current) {
            console.log('Starting video playback')
            remoteVideoRef.current.srcObject = remoteStreamRef.current
            remoteVideoRef.current.play()
                .then(() => {
                    console.log('Video playback started successfully')
                    setIsReceivingStream(true)
                })
                .catch(err => {
                    console.error('Error playing remote video:', err)
                    setStreamError(`Error playing video: ${err.message}`)
                })
        } else {
            console.error('Video element or stream is not available', {
                videoRef: remoteVideoRef.current,
                streamRef: remoteStreamRef.current
            })
            setStreamError('Video element or stream is not available')
        }
    }

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (connectionRef.current && remoteVideoRef.current) {
            const rect = remoteVideoRef.current.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height

            connectionRef.current.send({
                type: 'mousemove',
                x: x,
                y: y,
            })
        }
    }, [])

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (connectionRef.current && remoteVideoRef.current) {
            const rect = remoteVideoRef.current.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height

            connectionRef.current.send({
                type: 'mousedown',
                x: x,
                y: y,
                button: 0, // Touch events are treated as left mouse button clicks
            })
        }
    }, [])

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (connectionRef.current && remoteVideoRef.current) {
            const rect = remoteVideoRef.current.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height

            connectionRef.current.send({
                type: 'mouseup',
                x: x,
                y: y,
                button: 0, // Touch events are treated as left mouse button clicks
            })
        }
    }, [])

    const toggleMouseControl = useCallback(() => {
        isMouseControlActive.current = !isMouseControlActive.current
        if (isMouseControlActive.current) {
            remoteVideoRef.current?.requestPointerLock()
        } else {
            document.exitPointerLock()
        }
    }, [])

    useEffect(() => {
        const handlePointerLockChange = () => {
            isMouseControlActive.current = document.pointerLockElement === remoteVideoRef.current
        }

        document.addEventListener('pointerlockchange', handlePointerLockChange)
        return () => {
            document.removeEventListener('pointerlockchange', handlePointerLockChange)
        }
    }, [])

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Status Area */}
            <div className="bg-white shadow-md p-2">
                <h1 className="text-lg font-bold">Presentation Controller</h1>
                {connected ? (
                    <p className="text-sm text-green-600">Connected to presenter</p>
                ) : (
                    <p className="text-sm text-yellow-600">Connecting to presenter...</p>
                )}
                {streamError && (
                    <p className="text-sm text-red-600">{streamError}</p>
                )}
            </div>

            {/* Video Area */}
            <div 
                className="flex-grow flex items-center justify-center bg-gray-800 relative"
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                style={{ touchAction: 'none' }} // Prevent default touch actions
            >
                {isStreamReady && !isReceivingStream && (
                    <Button 
                        onClick={handleStartViewing} 
                        className="absolute top-4 left-4 z-10"
                    >
                        Start Viewing
                    </Button>
                )}
                <div className="w-full h-full max-w-[100vw] max-h-[calc(100vh-8rem)] flex items-center justify-center">
                    <video 
                        ref={remoteVideoRef}
                        playsInline 
                        className="max-w-full max-h-full object-contain" 
                        style={{ display: isReceivingStream ? 'block' : 'none' }}
                    />
                </div>
                {!isReceivingStream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-xl text-gray-400">
                            {isStreamReady ? 'Click "Start Viewing" to begin' : 'Waiting for presenter\'s stream...'}
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom Control Bar */}
            <div className="bg-white shadow-md p-2 flex justify-center space-x-4">
                <Button 
                    onClick={() => sendMessage('prev')} 
                    disabled={!connected}
                    variant="outline"
                    size="icon"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button 
                    onClick={() => sendMessage('next')} 
                    disabled={!connected}
                    variant="outline"
                    size="icon"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
                <Button 
                    onClick={() => sendMessage('laser')} 
                    disabled={!connected}
                    variant="outline"
                    size="icon"
                >
                    <MousePointer2 className="h-6 w-6" />
                </Button>
                <Button 
                    onClick={toggleMouseControl} 
                    disabled={!connected || !isReceivingStream}
                    variant={isMouseControlActive.current ? "default" : "outline"}
                >
                    {isMouseControlActive.current ? "Disable Mouse Control" : "Enable Mouse Control"}
                </Button>
            </div>
        </div>
    )
}

export default ControllerComponent
