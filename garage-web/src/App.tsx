import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/common'
import { DirectionProvider } from '@/components/ui/direction'
import { Toaster } from '@/components/ui/sonner'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout, ForgotPage, LoginPage, NewPasswordPage, SignupPage, VerifyPage } from '@/pages/auth'
import { GaragesPage } from '@/pages/garages'
import { OnboardingPage } from '@/pages/onboarding'
import { DashboardPage } from '@/pages/dashboard'
import { ReservationsPage } from '@/pages/reservations'
import { SchedulePage } from '@/pages/schedule'
import { ServicesPage } from '@/pages/services'
import { ProfilePage } from '@/pages/profile'
import { SettingsPage } from '@/pages/settings'

function RequireAuth() {
  const authed = useStore((s) => s.authed)
  const owner = useStore((s) => s.owner), loadOwner = useStore((s) => s.loadOwner)
  // After a reload the tokens are still there but the profile is not: fetch it once.
  useEffect(() => {
    if (authed && !owner) loadOwner().catch(() => undefined)
  }, [authed, owner, loadOwner])
  return authed ? <Outlet /> : <Navigate to="/login" replace />
}

/** The garage screens need a garage picked first (owners can have several), loaded from the API. */
function RequireGarage() {
  const { t } = useT()
  const active = useStore((s) => s.activeGarageId)
  const status = useStore((s) => s.garageStatus), loadGarage = useStore((s) => s.loadGarage)
  useEffect(() => {
    if (active && status === 'idle') loadGarage().catch(() => undefined)
  }, [active, status, loadGarage])

  if (!active) return <Navigate to="/garages" replace />
  if (status === 'ready') return <Outlet />
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark size={40} />
      {status === 'error' ? (
        <>
          <span className="text-muted-foreground">{t.loadError}</span>
          <Button variant="outline" onClick={() => loadGarage().catch(() => undefined)}>{t.retry}</Button>
        </>
      ) : (
        <span aria-busy="true" className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
    </div>
  )
}

export default function App() {
  const { L, dir } = useT()
  // Keep <html> in sync so the whole page (scrollbars, native inputs, portals) flips direction.
  useEffect(() => {
    document.documentElement.lang = L
    document.documentElement.dir = dir
  }, [L, dir])

  return (
    <DirectionProvider dir={dir}>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/forgot" element={<ForgotPage />} />
            <Route path="/reset-password" element={<NewPasswordPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/garages" element={<GaragesPage />} />
            <Route element={<RequireGarage />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/reservations" element={<ReservationsPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster dir={dir} />
    </DirectionProvider>
  )
}
