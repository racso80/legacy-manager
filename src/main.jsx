import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Ocultar loading screen cuando React monta
function hideLoader() {
  const el = document.getElementById('loading')
  if (el) {
    el.classList.add('hidden')
    setTimeout(() => el.remove(), 400)
  }
}

async function bootstrap() {
  let externalData = null

  // Intentar cargar data.json externo (equipos y jugadores actualizados)
  try {
    const res = await fetch('/data/data.json')
    if (res.ok) {
      externalData = await res.json()
      console.log('[Legacy Manager] Datos externos cargados:', externalData.exportedAt)
    }
  } catch (e) {
    console.log('[Legacy Manager] Usando datos integrados en el bundle')
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App externalData={externalData} onReady={hideLoader} />
    </React.StrictMode>
  )
}

bootstrap()
