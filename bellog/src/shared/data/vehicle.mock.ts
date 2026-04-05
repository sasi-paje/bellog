// Mock data for vehicle table
export interface VehicleMock {
  plate: string
  maxLoad: number
  responsible: string
  status: string
}

export const vehicleData: VehicleMock[] = [
  { plate: "ABC1BV2", maxLoad: 2300, responsible: "Bellog", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1200, responsible: "Bellog", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1500, responsible: "Bellog", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1800, responsible: "Bellog", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 2000, responsible: "Bellog", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 900, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 2100, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1400, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1600, responsible: "Agregado", status: "Inativo" },
  { plate: "ABC1BV2", maxLoad: 1700, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1300, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 2200, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 2400, responsible: "Agregado", status: "Inativo" },
  { plate: "ABC1BV2", maxLoad: 1900, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 850, responsible: "Agregado", status: "Inativo" },
  { plate: "ABC1BV2", maxLoad: 1150, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1750, responsible: "Agregado", status: "Ativo" },
  { plate: "ABC1BV2", maxLoad: 1350, responsible: "Agregado", status: "Inativo" },
]