import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useFoodPair, useVoteMutation } from '@/hooks'
import {
  createPairKey,
  normalizeFoodIds,
  determineVoteResult,
} from '@/lib/pair-utils'
import type { Food } from '@/lib/types'

interface FoodCardProps {
  food: Food
  onSelect: () => void
  isLoading?: boolean
}

function FoodCard({ food, onSelect, isLoading }: FoodCardProps) {
  return (
    <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-card">
      <div className="w-full aspect-square max-w-xs overflow-hidden rounded-lg">
        <img
          src={food.imageUrl}
          alt={food.name}
          className="w-full h-full object-cover"
        />
      </div>
      <h3 className="text-xl font-semibold text-center">{food.name}</h3>
      <Button
        onClick={onSelect}
        disabled={isLoading}
        size="lg"
        className="w-full"
      >
        Choose This
      </Button>
    </div>
  )
}

interface MoreOptionsProps {
  onTie: () => void
  onSkip: () => void
  isLoading?: boolean
}

function MoreOptions({ onTie, onSkip, isLoading }: MoreOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isExpanded) {
    return (
      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(true)}
          disabled={isLoading}
        >
          More options
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-2 items-center">
      <Button
        variant="outline"
        onClick={onTie}
        disabled={isLoading}
        className="w-full max-w-xs"
      >
        Both are good (Tie)
      </Button>
      <Button
        variant="ghost"
        onClick={onSkip}
        disabled={isLoading}
        className="w-full max-w-xs"
      >
        Skip / Don't know
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(false)}
        disabled={isLoading}
      >
        Hide options
      </Button>
    </div>
  )
}

export function FoodComparison() {
  const navigate = useNavigate()
  const {
    data: foodPair,
    isLoading: isPairLoading,
    error,
    refetch,
  } = useFoodPair()
  const voteMutation = useVoteMutation()

  const handleSelection = async (selectedFoodId: string | null) => {
    if (!foodPair) return

    const { presentedLeft, presentedRight } = foodPair
    const { foodLowId, foodHighId } = normalizeFoodIds(
      presentedLeft.id,
      presentedRight.id,
    )
    const pairKey = createPairKey(presentedLeft.id, presentedRight.id)
    const { result, winnerFoodId } = determineVoteResult(
      selectedFoodId,
      presentedLeft.id,
      presentedRight.id,
    )

    try {
      await voteMutation.mutateAsync({
        pairKey,
        foodLowId,
        foodHighId,
        presentedLeftId: presentedLeft.id,
        presentedRightId: presentedRight.id,
        result,
        winnerFoodId,
      })

      // Navigate to results page with the pairKey
      navigate({
        to: '/results/$pairKey',
        params: { pairKey },
      })
    } catch (error) {
      console.error('Vote submission failed:', error)
      // TODO: Show error toast/notification
    }
  }

  const isLoading = isPairLoading || voteMutation.isPending

  if (error) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">
          Error Loading Foods
        </h2>
        <p className="text-muted-foreground">
          Failed to load food comparison. Please try again.
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    )
  }

  if (isPairLoading || !foodPair) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading food comparison...</p>
      </div>
    )
  }

  const { presentedLeft, presentedRight } = foodPair

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          Which Korean food do you prefer?
        </h2>
        <p className="text-muted-foreground">
          Choose your favorite or select from more options below
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <FoodCard
          food={presentedLeft}
          onSelect={() => handleSelection(presentedLeft.id)}
          isLoading={isLoading}
        />
        <FoodCard
          food={presentedRight}
          onSelect={() => handleSelection(presentedRight.id)}
          isLoading={isLoading}
        />
      </div>

      <MoreOptions
        onTie={() => handleSelection('tie')}
        onSkip={() => handleSelection(null)}
        isLoading={isLoading}
      />

      {voteMutation.error && (
        <div className="text-center text-destructive">
          <p>Failed to submit vote. Please try again.</p>
        </div>
      )}
    </div>
  )
}
