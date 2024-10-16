'use client'

import React, { useEffect, useRef, useState } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'

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
            call.answer() // Answer the call without sending a stream back
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
            // Handle received data if needed
        })
    }

    const sendMessage = (message: string) => {
        if (connectionRef.current) {
            connectionRef.current.send(message)
        }
    }

    const handleStartViewing = () => {
        if (remoteVideoRef.current && remoteStreamRef.current) {
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
            setStreamError('Video element or stream is not available')
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1 className="text-2xl font-bold mb-4">Presentation Controller</h1>
            <div className="w-full max-w-md space-y-4">
                <div className="flex justify-center space-x-4">
                    <Button onClick={() => sendMessage('prev')} disabled={!connected}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous Slide
                    </Button>
                    <Button onClick={() => sendMessage('next')} disabled={!connected}>
                        Next Slide
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
                <div className="border-2 border-gray-300 p-2">
                    <h2 className="text-lg font-semibold mb-2">Presenter's Screen</h2>
                    {isStreamReady && !isReceivingStream && (
                        <Button onClick={handleStartViewing} className="mb-2">
                            <Play className="h-4 w-4 mr-2" />
                            Start Viewing
                        </Button>
                    )}
                    <video 
                        ref={remoteVideoRef} 
                        playsInline 
                        className="w-full h-48 bg-black" 
                        style={{ display: isReceivingStream ? 'block' : 'none' }}
                    />
                    {isReceivingStream ? (
                        <p className="text-green-600 mt-2">Receiving stream</p>
                    ) : (
                        <p className="text-yellow-600 mt-2">Waiting for presenter's stream...</p>
                    )}
                    {streamError && (
                        <p className="text-red-600 mt-2">{streamError}</p>
                    )}
                </div>
                <div className="text-center">
                    {connected ? (
                        <p className="text-green-600">Connected to presenter</p>
                    ) : (
                        <p className="text-yellow-600">Connecting to presenter...</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ControllerComponent
