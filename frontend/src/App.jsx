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
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <AnimatedBackground />
      <div className="scanline" />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(4,12,22,0.95)',
            border: '1px solid rgba(0,255,157,0.3)',
            color: '#e8f4f0',
            backdropFilter: 'blur(20px)',
            fontFamily: 'Space Grotesk',
            fontSize: '0.875rem',
            borderRadius: '10px',
            boxShadow: '0 0 20px rgba(0,255,157,0.15)',
          },
          success: {
            iconTheme: { primary: '#00ff9d', secondary: '#020408' },
          },
          error: {
            iconTheme: { primary: '#ff2d55', secondary: '#020408' },
            style: {
              background: 'rgba(4,12,22,0.95)',
              border: '1px solid rgba(255,45,85,0.3)',
              color: '#e8f4f0',
              backdropFilter: 'blur(20px)',
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
