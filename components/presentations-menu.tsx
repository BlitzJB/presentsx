'use client'

import React, { useState, useEffect } from 'react'
import { PlusCircle, FileText, Edit2, Loader2, Clock, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PresentationService, TPresentation } from '@/lib/services/PresentationService'
import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function PresentationsMenuComponent() {
  const [presentations, setPresentations] = useState<TPresentation[]>([])
  const [recentPresentations, setRecentPresentations] = useState<TPresentation[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [presentationToDelete, setPresentationToDelete] = useState<TPresentation | null>(null)

  const { user } = useAuth()
  const router = useRouter()
  const presentationService = new PresentationService()

  useEffect(() => {
    if (user) {
      fetchPresentations()
      fetchRecentPresentations()
    }
  }, [user])

  const fetchPresentations = async () => {
    if (user) {
      setIsLoading(true)
      try {
        const userPresentations = await presentationService.getUserPresentations(user.uid)
        setPresentations(userPresentations)
      } catch (error) {
        console.error('Error fetching presentations:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const fetchRecentPresentations = async () => {
    if (user) {
      try {
        const recentPresentations = await presentationService.getRecentPresentations(user.uid)
        setRecentPresentations(recentPresentations)
      } catch (error) {
        console.error('Error fetching recent presentations:', error)
      }
    }
  }

  const handleCreatePresentation = async () => {
    if (user) {
      setIsCreating(true)
      try {
        const newPresentation = await presentationService.createPresentation(user.uid, newTitle, newDescription)
        setPresentations([newPresentation, ...presentations])
        setRecentPresentations([newPresentation, ...recentPresentations.slice(0, 4)])
        setIsCreating(false)
        setIsCreated(true)
      } catch (error) {
        console.error('Error creating presentation:', error)
        setIsCreating(false)
      }
    }
  }

  const resetDialog = () => {
    setNewTitle('')
    setNewDescription('')
    setIsCreating(false)
    setIsCreated(false)
  }

  const handleViewPresentation = async (id: string) => {
    await presentationService.updateTouched(id)
    router.push(`/presentation/${id}`)
  }

  const handleEditPresentation = async (id: string) => {
    await presentationService.updateTouched(id)
    router.push(`/presentation/${id}/edit`)
  }

  const handleDeletePresentation = async (presentation: TPresentation) => {
    setPresentationToDelete(presentation)
  }

  const confirmDeletePresentation = async () => {
    if (presentationToDelete && user) {
      try {
        await presentationService.deletePresentation(presentationToDelete.id)
        setPresentations(presentations.filter(p => p.id !== presentationToDelete.id))
        setRecentPresentations(recentPresentations.filter(p => p.id !== presentationToDelete.id))
      } catch (error) {
        console.error('Error deleting presentation:', error)
      } finally {
        setPresentationToDelete(null)
      }
    }
  }

  const PresentationCard = ({ presentation }: { presentation: TPresentation }) => (
    <Card key={presentation.id}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {presentation.title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDeletePresentation(presentation)}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{presentation.description}</p>
        <p className="text-sm text-gray-500">Last edited: {
          typeof presentation.updatedAt === 'object' &&
          'toDate' in presentation.updatedAt ?
          // @ts-ignore
          presentation.updatedAt.toDate().toLocaleDateString() :
          presentation.updatedAt.toLocaleDateString()
        }</p>
        <p className="text-sm text-gray-500">{presentation.slides.length} slides</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => handleViewPresentation(presentation.id)}>
          <FileText className="mr-2 h-4 w-4" /> View
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleEditPresentation(presentation.id)}>
          <Edit2 className="mr-2 h-4 w-4" /> Edit
        </Button>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Presentations</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetDialog()
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Presentation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Presentation</DialogTitle>
              <DialogDescription>
                Enter the details for your new presentation.
              </DialogDescription>
            </DialogHeader>
            {!isCreated ? (
              <>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreatePresentation} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-center mb-4">Your presentation is ready to edit!</p>
                <Button onClick={() => setIsDialogOpen(false)}>Go to Editor</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Presentations Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <Clock className="mr-2 h-5 w-5" /> Recent Presentations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentPresentations.map((presentation) => (
            <PresentationCard key={presentation.id} presentation={presentation} />
          ))}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!presentationToDelete} onOpenChange={() => setPresentationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this presentation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your presentation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePresentation}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* All Presentations Section */}
      <h2 className="text-2xl font-semibold mb-4">All Presentations</h2>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presentations.map((presentation) => (
            <PresentationCard key={presentation.id} presentation={presentation} />
          ))}
        </div>
      )}
    </div>
  )
}
