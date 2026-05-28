import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import AuthGuard from './AuthGuard'
import CustomCursor from './components/CustomCursor'
import AnimatedBackground from './components/AnimatedBackground'
import LandingPage from './pages/LandingPage'
import FarmerLogin from './pages/FarmerLogin'
import BuyerLogin from './pages/BuyerLogin'
import Register from './pages/Register'
import FarmerDashboard from './pages/FarmerDashboard'
import BuyerMarketplace from './pages/BuyerMarketplace'
import MobileCamera from './pages/MobileCamera'
import QRCamera from './pages/QRCamera'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/farmer/login" element={<FarmerLogin />} />
        <Route path="/buyer/login" element={<BuyerLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/farmer/dashboard" element={
          <AuthGuard requiredRole="farmer"><FarmerDashboard /></AuthGuard>
        } />
        <Route path="/buyer/marketplace" element={
          <AuthGuard requiredRole="buyer"><BuyerMarketplace /></AuthGuard>
        } />
        <Route path="/camera" element={<MobileCamera />} />
        <Route path="/qr-camera" element={<QRCamera />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <AnimatedBackground />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid rgba(34, 139, 87, 0.25)',
            color: '#1a2e22',
            boxShadow: '0 4px 20px rgba(34, 139, 87, 0.1)',
            fontFamily: 'Space Grotesk',
            fontSize: '0.875rem',
            borderRadius: '10px',
          },
          success: {
            iconTheme: { primary: '#22a855', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#d93025', secondary: '#ffffff' },
            style: {
              background: '#ffffff',
              border: '1px solid rgba(217, 48, 37, 0.25)',
              color: '#1a2e22',
              boxShadow: '0 4px 20px rgba(217, 48, 37, 0.1)',
              fontFamily: 'Space Grotesk',
              fontSize: '0.875rem',
              borderRadius: '10px',
            },
          },
        }}
      />
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
