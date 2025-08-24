import { createFileRoute } from '@tanstack/react-router'
import { UserProfile } from '@/components/UserProfile'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Profile</h1>
      <UserProfile />
    </div>
  )
}
