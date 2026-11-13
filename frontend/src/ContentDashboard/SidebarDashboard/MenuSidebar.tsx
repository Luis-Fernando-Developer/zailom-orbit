import { useEffect, useState, type CSSProperties } from 'react'
import {
  BarChart3,
  CalendarDays,
  FileImage,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Send,
  Settings,
  Share2,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MenuSidebarProps {
  className?: string
  style?: CSSProperties
}

interface MenuItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
}

const menuGroups: MenuItem[][] = [
  [
    { id: 'overview', label: 'Visão geral', path: '#page-overview', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendário', path: '#page-calendar', icon: CalendarDays },
    { id: 'posts', label: 'Publicações', path: '#page-posts', icon: Send },
  ],
  [
    { id: 'inbox', label: 'Caixa de entrada', path: '#page-inbox', icon: Inbox },
    { id: 'automations', label: 'Automações', path: '#page-automations', icon: Sparkles },
    { id: 'analytics', label: 'Análises', path: '#page-analytics', icon: BarChart3 },
    { id: 'marketing', label: 'Marketing', path: '#page-marketing', icon: Megaphone },
  ],
  [
    { id: 'accounts', label: 'Redes conectadas', path: '#page-accounts', icon: Share2 },
    { id: 'library', label: 'Biblioteca de conteúdo', path: '#page-library', icon: FileImage },
    { id: 'team', label: 'Equipe e permissões', path: '#page-team', icon: UsersRound },
    { id: 'settings', label: 'Configurações', path: '#page-settings', icon: Settings },
  ],
]

export default function MenuSidebar({ className, style }: MenuSidebarProps) {
  const [activePath, setActivePath] = useState(
    typeof window === 'undefined' ? '#page-overview' : window.location.hash || '#page-overview',
  )

  useEffect(() => {
    const updateActivePath = () => setActivePath(window.location.hash || '#page-overview')

    window.addEventListener('hashchange', updateActivePath)
    return () => window.removeEventListener('hashchange', updateActivePath)
  }, [])

  return (
    <TooltipProvider delayDuration={350}>
      <nav
        aria-label="Navegação principal"
        className={className}
        style={style}
      >
        {menuGroups.map((group, groupIndex) => (
          <div
            className={`flex w-full flex-col items-center gap-5 ${groupIndex > 0 ? 'border-t border-white/15 py-4' : 'py-5'}`}
            key={group[0].id}
          >
            {group.map(({ id, label, path, icon: Icon }) => {
              const isActive = activePath === path

              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <a
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={label}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }`}
                      href={path}
                    >
                      <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="border border-white/15 bg-slate-950/80 text-slate-50 shadow-xl backdrop-blur-xl"
                  >
                    {label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  )
}
