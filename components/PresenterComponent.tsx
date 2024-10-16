'use client'

import React, { useRef, useState } from 'react'
import Peer, { DataConnection, MediaConnection } from 'peerjs'

function PresenterComponent() {
    const [peerId, setPeerId] = useState<string>('')
    const [connected, setConnected] = useState(false)
    const [message, setMessage] = useState<string>('')
    const [receivedMessages, setReceivedMessages] = useState<string[]>([])
    const [isReady, setIsReady] = useState(false)
    const peerRef = useRef<Peer | null>(null)
    const connectionRef = useRef<DataConnection | null>(null)
    const callRef = useRef<MediaConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)

    const initializePeerConnection = () => {
        const peer = new Peer({
            host: 'localhost',
            port: 8000,
            path: '/myapp'
        })
        
        peer.on('open', (id) => {
            console.log('Presenter ID is: ' + id)
            setPeerId(id)
            startScreenShare()
        })

        peer.on('connection', (conn) => {
            console.log('Controller connected')
            connectionRef.current = conn
            setConnected(true)
            setupDataConnection(conn)
            if (localStreamRef.current) {
                callController(conn.peer)
            }
        })

        peer.on('error', (err) => {
            console.error('Peer error:', err)
        })

        peerRef.current = peer
    }

    const setupDataConnection = (conn: DataConnection) => {
        conn.on('data', (data: unknown) => {
            console.log('Received data:', data)
            setReceivedMessages(prev => [...prev, `Controller: ${data as string}`])
        })
    }

    const startScreenShare = async () => {
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
                if (connectionRef.current) {
                    startScreenShare() // Restart screen sharing
                }
            }

            if (connectionRef.current) {
                callController(connectionRef.current.peer)
            }
        } catch (err) {
            console.error('Error getting display media:', err)
        }
    }

    const callController = (controllerId: string) => {
        if (peerRef.current && localStreamRef.current) {
            callRef.current = peerRef.current.call(controllerId, localStreamRef.current)
            callRef.current.on('error', (err) => {
                console.error('Call error:', err)
            })
            console.log('Started call to controller')
        }
    }

    const sendMessage = () => {
        if (connectionRef.current && message) {
            connectionRef.current.send(message)
            setReceivedMessages(prev => [...prev, `Presenter: ${message}`])
            setMessage('')
        }
    }

    const handleStartPresenting = () => {
        setIsReady(true)
        initializePeerConnection()
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Presenter Interface</h1>
            {!isReady ? (
                <button 
                    onClick={handleStartPresenting} 
                    className="p-2 bg-green-500 text-white rounded mb-4"
                >
                    Start Presenting
                </button>
            ) : (
                <>
                    <p className="mb-4">Your Presenter ID: {peerId}</p>
                    <div className="mb-4">
                        <p>{connected ? 'Controller connected' : 'Waiting for controller...'}</p>
                    </div>
                    <div className="w-full max-w-md">
                        <div className="mb-4 h-40 overflow-y-auto border p-2">
                            {receivedMessages.map((msg, index) => (
                                <p key={index}>{msg}</p>
                            ))}
                        </div>
                        <div className="flex">
                            <input 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type a message"
                                className="flex-grow p-2 border rounded-l"
                            />
                            <button onClick={sendMessage} className="p-2 bg-blue-500 text-white rounded-r">Send</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default PresenterComponent
