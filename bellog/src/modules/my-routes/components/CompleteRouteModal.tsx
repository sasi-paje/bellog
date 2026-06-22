/**
 * Modal de confirmação para finalizar rota
 * Segue o design do Figma com título, texto e botões
 */

import React from 'react'
import type { MyRouteListItem } from '../types/my-routes.types'

interface CompleteRouteModalProps {
  data: MyRouteListItem
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export const CompleteRouteModal: React.FC<CompleteRouteModalProps> = ({
  data,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[6px] p-[12px] w-full min-w-[50vw] flex flex-col gap-[16px]">
        {/* Título */}
        <div className="flex flex-col gap-[12px]">
          <p className="font-extrabold text-primary-dark text-[16px]">
            Finalizar Rota
          </p>

          {/* Texto de confirmação */}
          <div className="flex items-center">
            <p className="font-medium text-neutral-black text-[14px]">
              Deseja finalizar{' '}
              <span className="font-bold">
                {data.route_code} - {data.area_description}?
              </span>
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-[16px] h-[40px]">
          {/* Botão Voltar */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 border border-[#e67c26] rounded-[4px] bg-white flex items-center justify-center disabled:opacity-50"
          >
            <span className="font-bold text-[#e67c26] text-[14px]">
              Voltar
            </span>
          </button>

          {/* Botão Confirmar */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-[#e67c26] rounded-[4px] flex items-center justify-center disabled:opacity-50"
          >
            <span className="font-bold text-white text-[14px]">
              {isLoading ? 'Confirmando...' : 'Confirmar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompleteRouteModal
