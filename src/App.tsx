import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { DashboardPage } from './pages/DashboardPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { APIKeysPage } from './pages/APIKeysPage'
import { WebhooksPage } from './pages/WebhooksPage'
import { PlaygroundPage } from './pages/PlaygroundPage'
import { CollectPage } from './pages/CollectPage'
import { AccountPage } from './pages/AccountPage'
import { DisbursementPage } from './pages/DisbursementPage'
import { BulkPage } from './pages/BulkPage'
import { PaymentDetailPage } from './pages/PaymentDetailPage'
import { PaymentLinksPage } from './pages/PaymentLinksPage'
import { TeamPage } from './pages/TeamPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CustomersPage } from './pages/CustomersPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { SupportPage } from './pages/SupportPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { InvoiceFormPage } from './pages/InvoiceFormPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import BillSplitPage from './pages/BillSplitPage'
import { EnvProvider } from './context/EnvContext'
import { ThemeProvider } from './context/ThemeContext'
import { api } from './api'

function Guard({ children }: { children: React.ReactNode }) {
  return api.isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ThemeProvider>
    <EnvProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
        <Route path="/payments" element={<Guard><PaymentsPage /></Guard>} />
        <Route path="/api-keys" element={<Guard><APIKeysPage /></Guard>} />
        <Route path="/webhooks" element={<Guard><WebhooksPage /></Guard>} />
        <Route path="/collect" element={<Guard><CollectPage /></Guard>} />
        <Route path="/playground" element={<Guard><PlaygroundPage /></Guard>} />
        <Route path="/account" element={<Guard><AccountPage /></Guard>} />
        <Route path="/disbursement" element={<Guard><DisbursementPage /></Guard>} />
        <Route path="/bulk" element={<Guard><BulkPage /></Guard>} />
        <Route path="/payments/:id" element={<Guard><PaymentDetailPage /></Guard>} />
        <Route path="/payment-links" element={<Guard><PaymentLinksPage /></Guard>} />
        <Route path="/team" element={<Guard><TeamPage /></Guard>} />
        <Route path="/analytics" element={<Guard><AnalyticsPage /></Guard>} />
        <Route path="/customers" element={<Guard><CustomersPage /></Guard>} />
        <Route path="/audit" element={<Guard><AuditLogPage /></Guard>} />
        <Route path="/support" element={<Guard><SupportPage /></Guard>} />
        <Route path="/invoices" element={<Guard><InvoicesPage /></Guard>} />
        <Route path="/invoices/new" element={<Guard><InvoiceFormPage /></Guard>} />
        <Route path="/invoices/:id" element={<Guard><InvoiceDetailPage /></Guard>} />
        <Route path="/bill-splits" element={<Guard><BillSplitPage /></Guard>} />
        <Route path="/invoices/:id/edit" element={<Guard><InvoiceFormPage /></Guard>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </EnvProvider>
    </ThemeProvider>
  )
}
