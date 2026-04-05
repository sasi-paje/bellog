import { PageHeader } from '../../../shared/components'
import { SettingsCard } from '../components/SettingsCard'

interface SettingsHomePageProps {
  userName?: string
  userRole?: string
  onNavigate?: (page: 'settings-vehicles' | 'settings-suppliers' | 'settings-cargos' | 'settings-recusas' | 'settings-abortadas' | 'settings-destinos' | 'settings-motoristas') => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

interface CardItem {
  id: string
  title: string
  description: string
  icon: string
  navigation?: 'settings-vehicles' | 'settings-suppliers' | 'settings-cargos' | 'settings-recusas' | 'settings-abortadas' | 'settings-destinos' | 'settings-motoristas'
}

interface SettingsSectionData {
  id: string
  title: string
  cards: CardItem[]
}

const settingsSections: SettingsSectionData[] = [
  {
    id: 'sistema',
    title: 'Sistema',
    cards: [
      {
        id: 'cargos',
        title: 'Cargos',
        description: 'Gerenciamento de cargos do sistema',
        icon: 'work',
        navigation: 'settings-cargos',
      },
      {
        id: 'recusas',
        title: 'Recusas',
        description: 'Gerenciamento de entregas Recusadas',
        icon: 'do_not_disturb_on',
        navigation: 'settings-recusas',
      },
      {
        id: 'abortadas',
        title: 'Abortadas',
        description: 'Gerenciamento de entregas Abortadas',
        icon: 'location_off',
        navigation: 'settings-abortadas',
      },
    ],
  },
  {
    id: 'locais',
    title: 'Locais',
    cards: [
      {
        id: 'destinos',
        title: 'Destinos',
        description: 'Gerenciar os possíveis destinos',
        icon: 'location_on',
        navigation: 'settings-destinos',
      },
      {
        id: 'fornecedores',
        title: 'Fornecedores',
        description: 'Gerenciar os fornecedores',
        icon: 'pallet',
        navigation: 'settings-suppliers',
      },
    ],
  },
  {
    id: 'transportes',
    title: 'Transportes',
    cards: [
      {
        id: 'motoristas',
        title: 'Motoristas',
        description: 'Gerenciamento de motoristas do sistema',
        icon: 'person_apron',
        navigation: 'settings-motoristas',
      },
      {
        id: 'veiculos',
        title: 'Veículos',
        description: 'Gerenciamento de Veículos',
        icon: 'delivery_truck_speed',
        navigation: 'settings-vehicles',
      },
      {
        id: 'ajudante',
        title: 'Ajudante',
        description: 'Gerenciamento de Ajudantes',
        icon: 'group',
      },
    ],
  },
]

// Section Container Component
const SettingsSection = ({
  title,
  cards,
  onCardClick,
}: {
  title: string
  cards: CardItem[]
  onCardClick: (card: CardItem) => void
}) => (
  <section className="flex flex-col gap-[8px] p-[12px] bg-white border border-[#bdbdbd] rounded-[6px]">
    {/* Section Title */}
    <h2 className="font-semibold text-[20px] text-black leading-[20px]">
      {title}
    </h2>

    {/* Cards Row */}
    <div className="flex gap-[16px]">
      {cards.map((card) => (
        <SettingsCard
          key={card.id}
          title={card.title}
          description={card.description}
          iconName={card.icon}
          onClick={() => onCardClick(card)}
        />
      ))}
    </div>
  </section>
)

export const SettingsHomePage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onNavigate,
  isSidebarOpen = true,
  onToggleSidebar,
}: SettingsHomePageProps) => {
  const handleCardClick = (card: CardItem) => {
    if (card.navigation && onNavigate) {
      onNavigate(card.navigation)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <PageHeader
        title="Configurações"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userRole={userRole}
      />

      {/* Main Content - Settings Sections */}
      <main className="flex flex-col gap-[24px] px-8 py-4 flex-1 overflow-auto bg-[#ffffff]">
        {settingsSections.map((section) => (
          <SettingsSection
            key={section.id}
            title={section.title}
            cards={section.cards}
            onCardClick={handleCardClick}
          />
        ))}
      </main>
    </div>
  )
}
