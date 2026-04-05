import type { LucideProps } from 'lucide-react'

// Lista oficial de ícones - baseada no Figma
type IconName =
  // Navigation
  | 'left_panel_close'
  | 'left_panel_open'
  | 'keyboard_arrow_down'
  | 'chevron_left'
  | 'chevron_right'
  | 'chevrons_left'
  | 'chevrons_right'
  | 'close'
  // Action
  | 'search'
  | 'add_circle'
  | 'add_box'
  | 'add'
  | 'edit'
  | 'delete_forever'
  | 'open_in_new'
  | 'download'
  | 'publish'
  | 'attach_file'
  // User Interaction
  | 'person'
  | 'group'
  | 'visibility'
  | 'error'
  | 'info'
  // Business
  | 'work'
  | 'location_off'
  | 'location_on'
  | 'pallet'
  | 'person_apron'
  | 'delivery_truck_speed'
  | 'local_shipping'
  | 'filter_alt'
  // Functionality - Sidebar Menu
  | 'dashboard'
  | 'settings'
  | 'road'
  | 'contract'
  | 'calendar_month'
  | 'dataset_linked'
  | 'schedule'
  | 'event_list'
  // Additional
  | 'overview'
  | 'export_notes'
  | 'do_not_disturb_on'
  | 'image'
  | 'add_a_photo'
  | 'file_copy'

interface AppIconProps extends Omit<LucideProps, 'ref'> {
  name: IconName
  size?: number
  className?: string
  color?: string
}

// Mapeamento para nomes REAIS do Material Symbols
const iconMap: Record<IconName, string> = {
  // Navigation
  left_panel_close: 'left_panel_close',
  left_panel_open: 'left_panel_open',
  keyboard_arrow_down: 'keyboard_arrow_down',
  chevron_left: 'chevron_left',
  chevron_right: 'chevron_right',
  chevrons_left: 'double_arrow',
  chevrons_right: 'double_arrow',
  close: 'close',
  // Action
  search: 'search',
  add_circle: 'add_circle',
  add_box: 'add_box',
  add: 'add',
  edit: 'edit',
  delete_forever: 'delete_forever',
  open_in_new: 'open_in_new',
  download: 'download',
  publish: 'publish',
  attach_file: 'attach_file',
  // User Interaction
  person: 'person',
  group: 'group',
  visibility: 'visibility',
  error: 'error',
  info: 'info',
  // Business
  work: 'work',
  location_off: 'location_off',
  location_on: 'location_on',
  pallet: 'pallet',
  person_apron: 'person_apron',
  delivery_truck_speed: 'delivery_truck_speed',
  local_shipping: 'local_shipping',
  filter_alt: 'filter_alt',
  // Functionality - Sidebar Menu
  dashboard: 'dashboard',
  settings: 'settings',
  road: 'road',
  contract: 'contract',
  calendar_month: 'calendar_month',
  dataset_linked: 'dataset_linked',
  schedule: 'schedule',
  event_list: 'event_list',
  // Additional
  overview: 'overview',
  export_notes: 'export_notes',
  do_not_disturb_on: 'do_not_disturb_on',
  image: 'image',
  add_a_photo: 'add_a_photo',
  file_copy: 'file_copy',
}

export const AppIcon = ({ name, size = 24, className = '', color }: AppIconProps) => {
  const iconName = iconMap[name]

  if (!iconName) {
    console.warn(`Icon "${name}" not found in icon map`)
    return null
  }

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, color }}
    >
      {iconName}
    </span>
  )
}
