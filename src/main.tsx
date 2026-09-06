import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { StoreProvider } from './store/store'
import { RouterProvider } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </StoreProvider>
  </StrictMode>,
)
