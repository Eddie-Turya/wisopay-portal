import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { SignupPage } from './pages/SignupPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { APIKeysPage } from './pages/APIKeysPage'
import { WebhooksPage } from './pages/WebhooksPage'
import { PlaygroundPage } from './pages/PlaygroundPage'
import { CollectPage } from './pages/CollectPage'
import { AccountPage } from './pages/AccountPage'
import { BulkPage } from './pages/BulkPage'
import { PaymentDetailPage } from './pages/PaymentDetailPage'
import { PaymentLinksPage } from './pages/PaymentLinksPage'
import { TeamPage } from './pages/TeamPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { SupportPage } from './pages/SupportPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { InvoiceFormPage } from './pages/InvoiceFormPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import BillSplitPage from './pages/BillSplitPage'
import { EnvProvider } from './context/EnvContext'
import { ThemeProvider } from './context/ThemeContext'
// ZawaPay design (src/z): shell and pages
import { Shell } from './z/Shell'
import { Login } from './z/views/Login'
import { Home } from './z/views/Overview'
import { Payments } from './z/views/Payments'
import { Payouts } from './z/views/Payouts'
import { Analytics, Balances, Settlements } from './z/views/Money'
import { Customers } from './z/views/GetPaid'
import { Developers, SettingsView } from './z/views/Account'
import { Statements } from './z/views/Statements'
import { Docs } from './z/views/Docs'

function Signed() {
  return <Shell><Outlet /></Shell>
}

export default function App() {
  return (
    <ThemeProvider>
    <EnvProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route element={<Signed />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/payments/:id" element={<PaymentDetailPage />} />
          <Route path="/payouts" element={<Payouts />} />
          <Route path="/disbursement" element={<Navigate to="/payouts" replace />} />
          <Route path="/balances" element={<Balances />} />
          <Route path="/settlements" element={<Settlements />} />
          <Route path="/statements" element={<Statements />} />
          <Route path="/collect" element={<CollectPage />} />
          <Route path="/payment-links" element={<PaymentLinksPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceFormPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
          <Route path="/bill-splits" element={<BillSplitPage />} />
          <Route path="/bulk" element={<BulkPage />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/settings" element={<SettingsView />} />
          {/* Older WisoPay pages, still reachable from search (⌘K) and links */}
          <Route path="/api-keys" element={<APIKeysPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </EnvProvider>
    </ThemeProvider>
  )
}
