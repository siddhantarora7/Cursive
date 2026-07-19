import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import { App } from './ui/App'
import { applyTheme, paper } from './themes'

// boot theme before first paint; App re-applies the persisted choice
applyTheme(paper)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
