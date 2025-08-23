import { useLeaderboard } from '@/hooks'
import type { Food } from '@/lib/types'

interface LeaderboardItemProps {
  food: Food
  position: number
}

function LeaderboardItem({ food, position }: LeaderboardItemProps) {
  const getRankColor = (pos: number) => {
    if (pos === 1) return 'text-yellow-600 dark:text-yellow-400'
    if (pos === 2) return 'text-gray-600 dark:text-gray-400'
    if (pos === 3) return 'text-amber-600 dark:text-amber-400'
    return 'text-muted-foreground'
  }

  const getRankIcon = (pos: number) => {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return `#${pos}`
  }

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div
        className={`text-2xl font-bold w-12 text-center ${getRankColor(position)}`}
      >
        {getRankIcon(position)}
      </div>

      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={food.imageUrl}
          alt={food.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-grow min-w-0">
        <h3 className="font-semibold text-lg truncate">{food.name}</h3>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>ELO: {food.eloScore}</span>
          <span>Votes: {food.totalVotes}</span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-2xl font-bold text-primary">{food.eloScore}</div>
        <div className="text-xs text-muted-foreground">ELO Score</div>
      </div>
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 p-4 border rounded-lg"
        >
          <div className="w-12 h-8 bg-muted rounded animate-pulse"></div>
          <div className="w-16 h-16 bg-muted rounded-lg animate-pulse"></div>
          <div className="flex-grow space-y-2">
            <div className="h-5 bg-muted rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
          </div>
          <div className="w-16 h-8 bg-muted rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  )
}

export function Leaderboard() {
  const { data: foods, isLoading, error, refetch } = useLeaderboard()

  if (error) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">
          Error Loading Leaderboard
        </h2>
        <p className="text-muted-foreground">
          Failed to load the food rankings. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Korean Food Leaderboard</h1>
        <p className="text-muted-foreground mt-2">
          Rankings based on community votes using ELO scoring system
        </p>
        {foods && (
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {new Date().toLocaleString()}
          </p>
        )}
      </div>

      {isLoading ? (
        <LeaderboardSkeleton />
      ) : foods && foods.length > 0 ? (
        <div className="space-y-3">
          {foods.map((food, index) => (
            <LeaderboardItem key={food.id} food={food} position={index + 1} />
          ))}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">No Foods Found</h2>
          <p className="text-muted-foreground">
            No food data available. The database might need to be seeded with
            Korean food data.
          </p>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground">
        <p>
          ELO scores are updated in real-time based on head-to-head comparisons.
          Higher scores indicate foods that consistently win against others.
        </p>
      </div>
    </div>
  )
}
