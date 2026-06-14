# ⚽ Legacy Manager

**Construye tu club. Forja tu legado.**

Manager de fútbol web para LaLiga EA Sports 2025/26. React + Vite. Sin backend. Sin login.

---

## 🚀 Despliegue rápido (Vercel)

### 1. Subir a GitHub

```bash
# Desde la carpeta del proyecto:
git init
git add .
git commit -m "Legacy Manager v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/legacy-manager.git
git push -u origin main
```

### 2. Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repositorio de GitHub
3. Configuración automática detecta Vite — no hay que tocar nada
4. Clic en **Deploy** → en 2 minutos tienes la URL

### 3. Actualizaciones futuras

Cualquier `git push` a `main` redespliega automáticamente.

---

## 🛠️ Desarrollo local

```bash
npm install
npm run dev
# Abre http://localhost:5173
```

---

## 📊 Actualizar jugadores y equipos

### Opción A — Admin Panel (recomendado)

1. Abre el artefacto **Legacy Manager Admin** en Claude
2. Edita equipos y jugadores visualmente
3. Exporta `data.json`
4. Coloca el archivo en `public/data/data.json`
5. Haz `git push` → Vercel redespliega

### Opción B — Editar JSON manualmente

Edita `public/data/data.json` directamente con cualquier editor de texto.
El formato sigue la estructura del Admin.

---

## 🖼️ Añadir fotos de jugadores

1. Coloca las imágenes en `public/players/`
2. Nombre del archivo: `{id-jugador}.png` (ej: `ath-20.png` para Nico Williams)
3. Tamaño recomendado: 300×400px, formato PNG
4. Haz `git push` → las fotos aparecen automáticamente en las cartas

Si un jugador no tiene foto, se muestra un avatar con sus iniciales.

---

## 📁 Estructura del proyecto

```
legacy-manager/
├── public/
│   ├── data/
│   │   └── data.json          ← Datos actualizables (exportar desde Admin)
│   ├── players/
│   │   ├── ath-20.png         ← Foto de Nico Williams
│   │   ├── rma-23.png         ← Foto de Mbappé
│   │   └── ...                ← Fotos de jugadores
│   └── favicon.svg
├── src/
│   ├── data/
│   │   └── dataLoader.js      ← Carga y fusiona datos
│   ├── App.jsx                ← Aplicación principal (LegacyManager)
│   └── main.jsx               ← Entry point + carga de data.json
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 🎮 Características V1

- 20 equipos reales de LaLiga EA Sports 2025/26
- ~430 jugadores reales con atributos
- Motor de partido con tácticas (mentalidad, presión, ritmo, estilo, riesgo)
- Simulación por tramos de 15 minutos
- Clasificación, calendario, finanzas, estadísticas
- Resumen post-partido con goleadores y MVP
- Fin de temporada con historial de temporadas
- Segunda temporada con evolución de jugadores
- Guardado automático en localStorage
- Diseño responsive (móvil + escritorio)
- Sin backend · Sin login · Sin pagos

---

## 📦 Tecnologías

- **React 18** + **Vite 6**
- **CSS-in-JS** (estilos inline)
- **localStorage** para guardado de partidas
- **data.json** para datos actualizables

---

## 📄 Licencia

Proyecto personal. Datos de jugadores con fines educativos.
