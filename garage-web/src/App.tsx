import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { DirectionProvider } from '@/components/ui/direction'
import { Toaster } from '@/components/ui/sonner'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout, ForgotPage, LoginPage, NewPasswordPage, SignupPage, VerifyPage } from '@/pages/auth'
import { OnboardingPage } from '@/pages/onboarding'
import { DashboardPage } from '@/pages/dashboard'
import { ReservationsPage } from '@/pages/reservations'
import { SchedulePage } from '@/pages/schedule'
import { ServicesPage } from '@/pages/services'
import { ProfilePage } from '@/pages/profile'
import { SettingsPage } from '@/pages/settings'

function RequireAuth() {
  const authed = useStore((s) => s.authed)
  return authed ? <Outlet /> : <Navigate to="/login" replace />
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster dir={dir} />
    </DirectionProvider>
  )
}
