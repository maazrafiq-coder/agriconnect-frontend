import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { CONFIG_ERROR } from './lib/config'

const root = createRoot(document.getElementById('root'))

if (CONFIG_ERROR) {
  root.render(
    <div role="alert" style={{ maxWidth: 560, margin: '80px auto', padding: 24, fontFamily: 'system-ui, sans-serif', border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 12, color: '#7F1D1D' }}>
      <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>Configuration error</h1>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{CONFIG_ERROR}</p>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
