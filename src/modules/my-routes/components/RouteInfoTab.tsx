import React from 'react'
import { AppIcon } from '../../../shared/components/AppIcon'
import type { MyRouteDetail } from '../types/my-routes.types'

interface RouteInfoTabProps {
  route: MyRouteDetail
}

const Field: React.FC<{ label: string; value?: string | null; strong?: boolean }> = ({ label, value, strong = false }) => (
  <div className="flex flex-col gap-[8px]">
    <p className="font-semibold text-[14px] leading-normal text-[#2a2a2a]">{label}</p>
    <div className="bg-white h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px]">
      <p className={`text-[14px] leading-[24px] ${strong ? 'font-bold text-[#2a2a2a]' : 'font-medium text-[#4c4c4c]'}`}>
        {value || '-'}
      </p>
    </div>
  </div>
)

const joinNames = (items: Array<{ name?: string | null }> | undefined): string =>
  items?.map(item => item.name).filter(Boolean).join(', ') || ''

export const RouteInfoTab: React.FC<RouteInfoTabProps> = ({ route }) => {
  return (
    <div className="flex flex-col gap-[16px]">
      <p className="font-bold text-[20px] leading-[19.6px] text-black">Detalhes da Rota</p>

      <Field label="Número da rota" value={route.route_code} />
      <Field label="Nome da Rota" value={route.area_description} />
      <Field label="Responsável" value={joinNames(route.responsibles)} />

      <div className="border-t border-[#E5E7EB]" />

      <div className="flex flex-col gap-[8px]">
        <p className="font-semibold text-[14px] leading-normal text-[#2a2a2a]">Destino</p>
        {route.destinations.length > 0 ? (
          <div className="flex flex-col gap-[16px]">
            {route.destinations.map((dest, index) => (
              <div key={dest.id || index} className="bg-white h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] gap-[4px]">
                <AppIcon name="location_on" size={24} color="#F47B20" />
                <p className="font-medium text-[14px] leading-[24px] text-[#2a2a2a] truncate">
                  {dest.company_name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px]">
            <p className="font-medium text-[14px] leading-[24px] text-[#4c4c4c]">-</p>
          </div>
        )}
      </div>

      <div className="border-t border-[#E5E7EB]" />

      <Field label="Motorista" value={joinNames(route.drivers)} strong />
      <Field label="Veículo" value={route.vehicle?.plate} strong />
      <Field label="Ajudante" value={joinNames(route.helpers)} />
    </div>
  )
}

export default RouteInfoTab
