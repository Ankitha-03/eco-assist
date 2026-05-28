import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(8px)' },
  animate: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0, y: -20, scale: 1.02, filter: 'blur(8px)',
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  },
}

export default function PageTransition({ children }) {
  return (
    <motion.div variants={variants} initial="initial" animate="animate" exit="exit"
      style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      <motion.div
        initial={{ scaleX: 0, transformOrigin: 'left' }}
        animate={{ scaleX: [0, 1, 1, 0], transformOrigin: ['left', 'left', 'right', 'right'] }}
        transition={{ duration: 0.6, times: [0, 0.4, 0.6, 1], ease: 'easeInOut' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #22a855, #2196a8, #7c4dbe)',
          zIndex: 9000, pointerEvents: 'none',
        }}
      />
      {children}
    </motion.div>
  )
}
