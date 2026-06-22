import React from 'react'
import type { MyRouteListItem } from '../types/my-routes.types'

const OpenRouteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="#4c4c4c" />
  </svg>
)

interface RouteCardFigmaProps {
  route: MyRouteListItem
  onPress: (route: MyRouteListItem) => void
}

const RouteText: React.FC<{ route: MyRouteListItem; showDestinationCount?: boolean }> = ({
  route,
  showDestinationCount = false,
}) => (
  <div className="flex min-w-0 flex-col items-start justify-center">
    <span className="max-w-full truncate text-[14px] font-bold leading-[20px] text-[#2a2a2a]">
      {route.route_code}
    </span>
    <span className="max-w-full truncate text-[14px] font-medium leading-[20px] text-[#4c4c4c]">
      {route.area_description || 'Rota sem área'}
    </span>
    {showDestinationCount && route.destinations_count > 0 && (
      <span className="mt-[2px] text-[12px] leading-[16px] text-[#4c4c4c]">
        {route.destinations_count} {route.destinations_count === 1 ? 'destino' : 'destinos'}
      </span>
    )}
  </div>
)

export const RouteCardFigma: React.FC<RouteCardFigmaProps> = ({ route, onPress }) => {
  return (
    <button
      type="button"
      onClick={() => onPress(route)}
      className="flex min-h-[58px] w-full items-center justify-between rounded-[6px] border border-[#bdbdbd] bg-white px-[8px] py-[7px] text-left"
    >
      <RouteText route={route} />
      <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center">
        <OpenRouteIcon />
      </span>
    </button>
  )
}

interface InProgressRouteCardFigmaProps {
  route: MyRouteListItem
  onPress: (route: MyRouteListItem) => void
}

export const InProgressRouteCardFigma: React.FC<InProgressRouteCardFigmaProps> = ({ route, onPress }) => {
  return (
    <button
      type="button"
      onClick={() => onPress(route)}
      className="flex min-h-[58px] w-full items-center justify-between rounded-[6px] border border-[#bdbdbd] bg-white px-[8px] py-[7px] text-left"
    >
      <RouteText route={route} showDestinationCount />
      <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center">
        <OpenRouteIcon />
      </span>
    </button>
  )
}

interface EmptyInProgressMessageFigmaProps {
  showHint?: boolean
}

export const EmptyInProgressMessageFigma: React.FC<EmptyInProgressMessageFigmaProps> = ({ showHint = true }) => {
  return (
    <div className="flex w-full flex-col items-center justify-center px-[16px] py-[10px]">
      <p className="text-center text-[14px] font-medium leading-[19.6px] text-[#919191]">
        Nenhuma Rota em andamento..
      </p>
      {showHint && (
        <p className="text-center text-[14px] font-medium leading-[19.6px] text-[#919191]">
          Abra uma rota para inicia-la
        </p>
      )}
    </div>
  )
}

export default RouteCardFigma
