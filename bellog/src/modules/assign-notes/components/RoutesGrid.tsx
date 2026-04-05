import { RouteCard } from './RouteCard'
import { AssignedNote } from '../data/assign-notes.mock'

interface RouteCardData {
  id: string
  tipoRota: string
  numeroRota: string
  veiculo: string
  capacidade: number
  cargaAtual: number
  notasAtribuidas: AssignedNote[]
  isEmpty?: boolean
  id_vehicle?: string
  route_status?: string
}

interface RoutesGridProps {
  routes: RouteCardData[]
  onDropNote?: (noteId: string, routeId: string) => void
  onRemoveNote?: (routeId: string, noteId: string, invoiceNumber: string) => void
  onCreateRoute?: (vehicleId: string) => void
  onAlterRoute?: (routeId: string) => void
  onViewNote?: (note: AssignedNote) => void
  loading?: boolean
}

export const RoutesGrid = ({
  routes,
  onDropNote,
  onRemoveNote,
  onCreateRoute,
  onAlterRoute,
  onViewNote,
  loading = false,
}: RoutesGridProps) => {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-8 items-stretch w-full h-full overflow-visible">
      {routes.map(route => {
        const notes = route.notasAtribuidas || []
        const isTemporary = String(route.id).startsWith('vehicle-')

        // Para cards temporários, extrair o vehicleId do route.id
        const vehicleId = isTemporary ? route.id.replace('vehicle-', '') : undefined

        return (
          <div
            key={route.id}
            className="min-w-[260px] lg:min-w-[240px] md:min-w-[220px] flex-1 max-w-[350px] lg:max-w-[320px] md:max-w-[280px]"
          >
            <RouteCard
              route={{
                ...route,
                notasAtribuidas: notes,
              }}
              routeId={route.id}
              isTemporary={isTemporary}
              onDropNote={(noteId, routeId) => onDropNote?.(noteId, routeId)}
              onRemoveNote={(routeId, noteId, invoiceNumber) =>
                onRemoveNote?.(routeId, noteId, invoiceNumber)
              }
              onCreateRoute={() => vehicleId && onCreateRoute?.(vehicleId)}
              onAlterRoute={() => {
                console.log('[RoutesGrid] calling onAlterRoute for route:', route.id)
                onAlterRoute?.(String(route.id))
              }}
              onViewNote={onViewNote}
              loading={loading}
            />
          </div>
        )
      })}
    </div>
  )
}