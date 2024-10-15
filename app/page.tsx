'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { PresentationsMenuComponent } from '@/components/presentations-menu'

export default function PresentationBuilder() {
  return (
    <ProtectedRoute>
      <div className="h-screen">
        <PresentationsMenuComponent />
      </div>
    </ProtectedRoute>
  )
}
