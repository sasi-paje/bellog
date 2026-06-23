import { RouteCard } from './RouteCard'
import { AssignedNote, RouteCardData, DivergenceInfo } from '../types/assign-notes.types'

interface RoutesGridProps {
  routes: RouteCardData[]
  divergences?: Record<string, DivergenceInfo>
  onDropNote?: (noteId: string, routeId: string) => void
  onRemoveNote?: (routeId: string, noteId: string, invoiceNumber: string) => void
  onCreateRoute?: (vehicleId: string) => void
  onAlterRoute?: (routeId: string) => void
  onViewNote?: (note: AssignedNote) => void
  loading?: boolean
}

export const RoutesGrid = ({
  routes,
  divergences = {},
  onDropNote,
  onRemoveNote,
  onCreateRoute,
  onAlterRoute,
  onViewNote,
  loading = false,
}: RoutesGridProps) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 w-full">
      {routes.map(route => {
        const notes = route.notasAtribuidas || []
        const isTemporary = String(route.id).startsWith('vehicle-')
        const divergence = divergences[route.id]

        const vehicleId = isTemporary ? route.id.replace('vehicle-', '') : undefined

        return (
          <RouteCard
            key={route.id}
            route={{
              ...route,
              notasAtribuidas: notes,
            }}
            routeId={route.id}
            divergence={divergence}
            isTemporary={isTemporary}
            onDropNote={(noteId, routeId) => onDropNote?.(noteId, routeId)}
            onRemoveNote={(routeId, noteId, invoiceNumber) =>
              onRemoveNote?.(routeId, noteId, invoiceNumber)
            }
            onCreateRoute={() => vehicleId && onCreateRoute?.(vehicleId)}
            onAlterRoute={() => onAlterRoute?.(String(route.id))}
            onViewNote={onViewNote}
            loading={loading}
          />
        )
      })}
    </div>
  )
}

export default RoutesGrid