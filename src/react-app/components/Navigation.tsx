import { Link } from '@tanstack/react-router'
import { ModeToggle } from './mode-toggle'

export function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-foreground">
              🇰🇷 Korean Food Arena
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link
                to="/"
                className="text-foreground/80 hover:text-foreground transition-colors"
                activeProps={{
                  className: 'text-foreground font-medium',
                }}
              >
                Compare
              </Link>
              <Link
                to="/leaderboard"
                className="text-foreground/80 hover:text-foreground transition-colors"
                activeProps={{
                  className: 'text-foreground font-medium',
                }}
              >
                Leaderboard
              </Link>
              <Link
                to="/profile"
                className="text-foreground/80 hover:text-foreground transition-colors"
                activeProps={{
                  className: 'text-foreground font-medium',
                }}
              >
                Profile
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
