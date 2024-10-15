'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { ResizableBox } from 'react-resizable'
import Editor from '@monaco-editor/react'
import { Plus, Play, Gamepad2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Sandbox } from './Sandbox'
import { Input } from './ui/input'
import { TPresentation, TSlide } from '@/lib/services/PresentationService'
import { useDebouncedCallback } from 'use-debounce'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface PresentationBuilderProps {
  presentation: TPresentation
  updateSlide: (slideId: string, updatedSlide: Partial<TSlide>) => void
  updatePresentation: (data: Partial<TPresentation>) => void
  addSlide: () => Promise<TSlide | null>
  removeSlide: (slideId: string) => void
}

export function PresentationBuilder({
  presentation,
  updateSlide,
  updatePresentation,
  addSlide,
  removeSlide
}: PresentationBuilderProps) {
  const [localPresentation, setLocalPresentation] = useState<TPresentation>(presentation)
  const [selectedSlide, setSelectedSlide] = useState<TSlide | null>(presentation.slides[0] || null)
  const [key, setKey] = useState(0)
  const [slideToDelete, setSlideToDelete] = useState<TSlide | null>(null)
  const [hoveredSlideId, setHoveredSlideId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setLocalPresentation(presentation)
    setSelectedSlide(presentation.slides[0] || null)
  }, [presentation])

  const debouncedRefresh = useDebouncedCallback(() => {
    setKey(prevKey => prevKey + 1)
  }, 1000)

  const handleSlideCodeChange = useCallback((value: string | undefined) => {
    if (selectedSlide && value) {
      const updatedSlide = { ...selectedSlide, code: value }
      const updatedSlides = localPresentation.slides.map(slide => 
        slide.id === selectedSlide.id ? updatedSlide : slide
      )
      setLocalPresentation(prev => ({ ...prev, slides: updatedSlides }))
      setSelectedSlide(updatedSlide)
      updateSlide(selectedSlide.id, { code: value })
      debouncedRefresh()
    }
  }, [selectedSlide, updateSlide, localPresentation.slides, debouncedRefresh])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setLocalPresentation(prev => ({ ...prev, title: newTitle }))
    updatePresentation({ title: newTitle })
  }, [updatePresentation])

  const handleRefresh = useCallback(() => {
    setKey(prevKey => prevKey + 1)
  }, [])

  const handleAddSlide = useCallback(async () => {
    const addedSlide = await addSlide()
    console.log('addedSlide', addedSlide)
    if (addedSlide) {
      setLocalPresentation(prev => ({ ...prev, slides: [...prev.slides, addedSlide] }))
      setSelectedSlide(addedSlide)
      setKey(prevKey => prevKey + 1)
    }
  }, [addSlide])

  const handleRemoveSlide = useCallback((slide: TSlide) => {
    setSlideToDelete(slide)
  }, [])

  const confirmRemoveSlide = useCallback(() => {
    if (slideToDelete) {
      removeSlide(slideToDelete.id)
      setLocalPresentation(prev => ({
        ...prev,
        slides: prev.slides.filter(s => s.id !== slideToDelete.id)
      }))
      if (selectedSlide && selectedSlide.id === slideToDelete.id) {
        const index = localPresentation.slides.findIndex(slide => slide.id === slideToDelete.id)
        const nextSlide = localPresentation.slides[index + 1] || localPresentation.slides[index - 1] || null
        setSelectedSlide(nextSlide)
      }
      setSlideToDelete(null)
    }
  }, [removeSlide, slideToDelete, selectedSlide, localPresentation.slides])

  const handlePresent = useCallback(() => {
    if (localPresentation.id) {
      router.push(`/presentation/${localPresentation.id}`)
    }
  }, [localPresentation.id])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <Input
          value={localPresentation.title}
          onChange={handleTitleChange}
          className="text-2xl font-bold w-1/3"
        />
        <div className="space-x-2">
          <Button onClick={handlePresent}>
            <Play className="mr-2 h-4 w-4" /> Present
          </Button>
          <Button variant="outline">
            <Gamepad2 className="mr-2 h-4 w-4" /> Add Controller
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slide Preview Sidebar */}
        <div className="w-20 flex-shrink-0 bg-white p-2 overflow-y-auto flex flex-col items-center space-y-2">
          {localPresentation.slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`relative w-16 h-12 border rounded cursor-pointer overflow-hidden ${
                selectedSlide?.id === slide.id ? 'border-blue-500' : 'border-gray-200'
              }`}
              onClick={() => {
                setSelectedSlide(slide)
                setKey(prevKey => prevKey + 1)
              }}
              onMouseEnter={() => setHoveredSlideId(slide.id)}
              onMouseLeave={() => setHoveredSlideId(null)}
            >
              <div style={{ transform: 'scale(0.1)', transformOrigin: 'top left' }} className="w-[320px] h-[240px] origin-top-left">
                <Sandbox key={`preview-${slide.id}-${key}`} componentString={slide.code} />
              </div>
              <AnimatePresence>
                {hoveredSlideId === slide.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                    animate={{ opacity: 0.7, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-0 left-0"
                    whileHover={{ opacity: 1 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-4 h-4 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveSlide(slide)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-black" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <Button variant="outline" className="w-16 h-12" onClick={handleAddSlide}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Resizable Panes Container */}
        <div className="flex flex-1 overflow-hidden">
          {/* Resizable Code Editor */}
          <ResizableBox
            width={500}
            height={Infinity}
            minConstraints={[300, Infinity]}
            maxConstraints={[Infinity, Infinity]}
            axis="x"
            resizeHandles={['e']}
            handle={(h, ref) => (
              <div
                ref={ref}
                className={`react-resizable-handle react-resizable-handle-${h} w-2 cursor-col-resize bg-gray-200 hover:bg-gray-300`}
              />
            )}
          >
            <div className="h-full border-r">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={selectedSlide?.code}
                onChange={handleSlideCodeChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </div>
          </ResizableBox>

          {/* Preview Pane */}
          <div className="flex-1 bg-white p-4 h-full overflow-auto">
            {selectedSlide && <Sandbox key={key} componentString={selectedSlide.code} />}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!slideToDelete} onOpenChange={() => setSlideToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Slide</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this slide? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlideToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemoveSlide}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
