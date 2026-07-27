import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import { applyTheme, paper } from './themes'

// boot theme before first paint; the editor App re-applies the persisted choice
applyTheme(paper)

/*
 * Route split without a router: the landing page lives at `/`, the editor at
 * `/app`, the privacy page at `/privacy`. Each is its own lazy chunk so the
 * landing route never downloads TipTap and the editor never downloads the
 * landing animations. vercel.json rewrites the deep paths to index.html.
 */
const path = window.location.pathname
const Page = path.startsWith('/app')
  ? lazy(() => import('./ui/App').then((m) => ({ default: m.App })))
  : path.startsWith('/privacy')
    ? lazy(() => import('./landing/Privacy'))
    : lazy(() => import('./landing/Landing'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  </StrictMode>,
)
