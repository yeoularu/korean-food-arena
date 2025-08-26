import { Link } from '@tanstack/react-router'
import { ModeToggle } from './mode-toggle'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu'
import { Menu } from 'lucide-react'

export function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16 md:flex md:justify-between">
          {/* Left: Mobile menu + Desktop left cluster (logo + nav) */}
          <div className="flex items-center">
            {/* Mobile: hamburger menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="메뉴 열기">
                    <Menu className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="w-48"
                >
                  <DropdownMenuItem asChild>
                    <Link to="/" className="w-full">
                      Compare
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/leaderboard" className="w-full">
                      Leaderboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop: logo + nav links */}
            <div className="hidden md:flex items-center space-x-6 ml-0 md:ml-0">
              <Link
                to="/"
                className="text-base md:text-xl font-bold text-foreground"
              >
                🇰🇷 Korean Food Arena
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link
                  to="/"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                  activeProps={{ className: 'text-foreground font-medium' }}
                >
                  Compare
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                  activeProps={{ className: 'text-foreground font-medium' }}
                >
                  Leaderboard
                </Link>
                <Link
                  to="/profile"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                  activeProps={{ className: 'text-foreground font-medium' }}
                >
                  Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Center: Mobile-only centered logo */}
          <div className="md:hidden justify-self-center">
            <Link
              to="/"
              className="block max-w-[60vw] truncate text-center text-lg font-bold text-foreground"
            >
              🇰🇷 Korean Food Arena
            </Link>
          </div>

          {/* Right: theme toggle */}
          <div className="flex items-center justify-self-end space-x-4">
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
