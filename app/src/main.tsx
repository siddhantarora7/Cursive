import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import { App } from './ui/App'
import { applyTheme, paper } from './themes'

// boot theme before first paint; App re-applies the persisted choice
applyTheme(paper)

// "/" is the marketing route with the editor embedded as its hero;
// "/write" is the full-screen app. No router library — one split, full reloads.
const Landing = lazy(() => import('./landing/Landing').then((m) => ({ default: m.Landing })))
const isFullApp = window.location.pathname.startsWith('/write')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFullApp ? (
      <App />
    ) : (
      <Suspense fallback={<div style={{ minHeight: '100vh', background: 'oklch(0.145 0.015 250)' }} />}>
        <Landing />
      </Suspense>
    )}
  </StrictMode>,
)
