import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

function hideLoader() {
  const el = document.getElementById('loading')
  if (el) {
    el.style.opacity = '0'
    el.style.transition = 'opacity .3s'
    setTimeout(() => el.remove(), 350)
  }
}

async function bootstrap() {
  let externalData = null

  // Intentar cargar data.json externo — si falla o está vacío, usa datos integrados
  try {
    const res = await fetch('/data/data.json')
    if (res.ok) {
      const json = await res.json()
      // Solo usar si tiene equipos y jugadores reales
      if (json.teams && json.teams.length > 0 && json.players) {
        externalData = json
        console.log('[LM] Datos externos:', json.teams.length, 'equipos')
      }
    }
  } catch (e) {
    // Sin data.json — normal en primera instalación
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App externalData={externalData} />
    </React.StrictMode>
  )

  // Ocultar loader siempre, pase lo que pase
  setTimeout(hideLoader, 200)
}

bootstrap()
