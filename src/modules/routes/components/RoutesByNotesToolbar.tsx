import { useState, useEffect } from 'react'
import { PageToolbar, MultiSelectDropdown } from '../../../shared/components'
import { routeService } from '../../../features/routes/api/route.service'
import { companyService } from '../../../features/companies/api/company.service'

export interface NoteByRouteData {
  id: string
  route_code: string
  route_number: string
  invoice_number: string
  supplier_name: string
  destination_name: string
  vehicle_plate: string
  driver_name: string
  gross_weight: number
  invoice_value: number
  delivery_status: string
  motivo?: string
  attempt_number?: number
}

export interface FilterOption {
  value: string
  label: string
}

export interface RbnFilterValues {
  routeCode: string
  deliveryStatus: FilterOption[]
  motorista: FilterOption[]
  veiculo: FilterOption[]
  fornecedor: FilterOption[]
  destino: FilterOption[]
}

export const EMPTY_RBN_FILTERS: RbnFilterValues = {
  routeCode: '',
  deliveryStatus: [],
  motorista: [],
  veiculo: [],
  fornecedor: [],
  destino: [],
}

const isRbnFilterActive = (f: RbnFilterValues): boolean =>
  f.routeCode.trim() !== '' ||
  f.deliveryStatus.length > 0 ||
  f.motorista.length > 0 ||
  f.veiculo.length > 0 ||
  f.fornecedor.length > 0 ||
  f.destino.length > 0

interface RoutesByNotesToolbarProps {
  onExport?: () => void
  onExportSelected?: () => void
  isSelectionMode?: boolean
  selectedCount?: number
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  appliedFilters?: RbnFilterValues
  onApplyFilters?: (f: RbnFilterValues) => void
  onClearFilters?: () => void
  searchValue?: string
  onSearch?: (term: string) => void
}

export const RoutesByNotesToolbar = ({
  onExport,
  onExportSelected,
  isSelectionMode = false,
  selectedCount = 0,
  pageSize,
  onPageSizeChange,
  appliedFilters = EMPTY_RBN_FILTERS,
  onApplyFilters,
  onClearFilters,
  searchValue = '',
  onSearch,
}: RoutesByNotesToolbarProps) => {
  const [showFilters, setShowFilters] = useState(false)
  const [pending, setPending] = useState<RbnFilterValues>(appliedFilters)

  const [deliveryStatuses, setDeliveryStatuses] = useState<FilterOption[]>([])
  const [drivers, setDrivers] = useState<FilterOption[]>([])
  const [vehicles, setVehicles] = useState<FilterOption[]>([])
  const [suppliers, setSuppliers] = useState<FilterOption[]>([])
  const [destinos, setDestinos] = useState<FilterOption[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [ref, drv, sup, dest] = await Promise.all([
          routeService.getReferenceData(),
          routeService.getDrivers(),
          companyService.listSuppliersByRole(),
          companyService.listDeliveryLocations(),
        ])
        setDeliveryStatuses((ref.deliveryStatuses || []).map((s: any) => ({ value: s.name, label: s.name })))
        setVehicles((ref.vehicles || []).map((v: any) => ({ value: v.plate, label: v.plate })))
        setDrivers((drv || []).map((d: any) => ({ value: d.name, label: d.name })))
        setSuppliers(sup || [])
        setDestinos(dest || [])
      } catch (err) {
        console.error('[RoutesByNotesToolbar] load ref data:', err)
      }
    }
    load()
  }, [])

  // Sincroniza o rascunho quando o filtro aplicado muda de fora
  useEffect(() => {
    setPending(appliedFilters)
  }, [appliedFilters])

  const handleApply = () => {
    onApplyFilters?.(pending)
    setShowFilters(false)
  }

  const handleClear = () => {
    setPending(EMPTY_RBN_FILTERS)
    onClearFilters?.()
  }

  const setField = <K extends keyof RbnFilterValues>(key: K, value: RbnFilterValues[K]) =>
    setPending((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="relative">
      <PageToolbar
        search={{
          placeholder: 'Buscar pelo número da nota',
          value: searchValue,
          onChange: (v) => onSearch?.(v),
          onSearch: (v) => onSearch?.(v),
          width: '360px',
        }}
        filters={[{ isActive: showFilters || isRbnFilterActive(appliedFilters), onClick: () => setShowFilters((v) => !v) }]}
        pageSize={
          pageSize != null && onPageSizeChange
            ? { value: pageSize, options: [20, 50, 100], onChange: onPageSizeChange }
            : undefined
        }
        actions={[
          ...(isSelectionMode && onExportSelected
            ? [{
                label: selectedCount > 0 ? `Exportar Selecionados (${selectedCount})` : 'Exportar Selecionados',
                icon: 'upload',
                variant: 'default' as const,
                onClick: onExportSelected,
                disabled: selectedCount === 0,
              }]
            : (!isSelectionMode && onExport
              ? [{ label: 'Exportar', icon: 'upload', variant: 'default' as const, onClick: onExport }]
              : [])),
        ]}
      />

      {showFilters && (
        <div
          className="absolute left-4 top-full z-50 mt-1 flex w-[720px] max-w-[92vw] flex-col gap-4 rounded-[8px] border border-[#bdbdbd] bg-white p-5 shadow-lg"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Nº Rota */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-semibold text-[#0f3255]">Nº da Rota</label>
              <input
                type="text"
                value={pending.routeCode}
                onChange={(e) => setField('routeCode', e.target.value)}
                placeholder="Ex: 000123"
                className="h-[40px] rounded-[5px] border border-[#bdbdbd] px-3 text-[14px] text-[#2a2a2a] focus:border-[#e67c26] focus:outline-none"
              />
            </div>

            <MultiSelectDropdown label="Status de Entrega" options={deliveryStatuses} selectedOptions={pending.deliveryStatus} onChange={(v) => setField('deliveryStatus', v)} optional />
            <MultiSelectDropdown label="Motorista" options={drivers} selectedOptions={pending.motorista} onChange={(v) => setField('motorista', v)} optional />
            <MultiSelectDropdown label="Veículo" options={vehicles} selectedOptions={pending.veiculo} onChange={(v) => setField('veiculo', v)} optional />
            <MultiSelectDropdown label="Fornecedor" options={suppliers} selectedOptions={pending.fornecedor} onChange={(v) => setField('fornecedor', v)} optional />
            <MultiSelectDropdown label="Destino" options={destinos} selectedOptions={pending.destino} onChange={(v) => setField('destino', v)} optional />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="flex h-[40px] items-center justify-center rounded-[5px] border border-[#e67c26] bg-white px-4 text-[13px] font-bold text-[#e67c26] hover:bg-[#fdf1e7]"
            >
              Limpar Filtro
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex h-[40px] items-center justify-center rounded-[5px] bg-[#e67c26] px-4 text-[13px] font-bold text-white hover:bg-[#d06c1e]"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
