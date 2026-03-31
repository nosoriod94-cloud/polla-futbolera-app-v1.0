import { NavLink } from 'react-router-dom'
import { Home, Trophy, Star, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Inicio', icon: Home, exact: true },
  { to: '/predicciones', label: 'Predecir', icon: Star, exact: false },
  { to: '/posiciones', label: 'Posiciones', icon: Trophy, exact: false },
  { to: '/perfil', label: 'Mi perfil', icon: User, exact: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-lg mx-auto flex h-16">
        {links.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'fill-blue-600/20 dark:fill-blue-400/20')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
