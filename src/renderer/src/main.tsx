import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import HostedApp from './hosted/HostedApp'
import '@fontsource-variable/inter'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element missing')

const hosted = import.meta.env.VITE_HOSTED === '1'
const Root = hosted ? HostedApp : App

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
