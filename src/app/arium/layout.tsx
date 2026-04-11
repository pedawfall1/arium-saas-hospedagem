import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AriumShell from '@/components/layout/AriumShell'

export default async function AriumLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.email?.trim().toLowerCase() !== (process.env.ARIUM_ADMIN_EMAIL ?? '').trim().toLowerCase()) redirect('/dashboard')

  return (
    <AriumShell userEmail={user.email ?? ''}>
      {children}
    </AriumShell>
  )
}
