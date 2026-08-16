import { getCurrentUser } from '@/lib/session'
import PublicHeaderClient from './PublicHeaderClient'

export default async function PublicHeader() {
  const user = await getCurrentUser()
  const authState = user ? { name: user.name, role: user.role } : null

  return <PublicHeaderClient authState={authState} />
}
