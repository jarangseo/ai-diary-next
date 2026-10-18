import { AppShell } from '@/components/Shell/AppShell'
import { SettingsInit } from '@/components/Settings/SettingsInit'

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsInit />
      <AppShell>{children}</AppShell>
    </>
  )
}
