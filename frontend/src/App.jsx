import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AiAssistantPage from './pages/AiAssistantPage'
import AdminPage from './pages/AdminPage'
import BillingPage from './pages/BillingPage'
import NotificationsPage from './pages/NotificationsPage'
import PaymentPage from './pages/PaymentPage'
import WorkflowsBlogPage from './pages/WorkflowsBlogPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/ai" element={<AiAssistantPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/billing" element={<BillingPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/workflows" element={<WorkflowsBlogPage />} />
    </Routes>
  )
}

export default App
