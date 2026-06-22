/**
 * InfoField - Componente de campo de informação
 */
import React from 'react'

interface InfoFieldProps {
  label: string
  value?: string | number | null
  icon?: React.ReactNode
}

export const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon }) => {
  return (
    <div className="flex flex-col gap-[8px]">
      <label className="font-semibold text-[#2a2a2a] text-[14px]">
        {label}
      </label>
      <div className="bg-white min-h-[45px] rounded-[5px] px-[16px] py-[12px] flex items-center">
        {icon && (
          <span className="mr-[4px] text-[#2a2a2a]">
            {icon}
          </span>
        )}
        <span className={value ? 'font-medium text-[#2a2a2a] text-[14px] break-words' : 'text-[#919191] text-[14px]'}>
          {value || '-'}
        </span>
      </div>
    </div>
  )
}

export default InfoField
