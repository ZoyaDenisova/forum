import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.tsx' // App теперь используется через __root.tsx

import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/contexts/AuthContext'

// Импортируем сгенерированное дерево роутов
import { routeTree } from './routeTree.gen'

// Создаем новый экземпляр роутера
const router = createRouter({ routeTree })

// Создаем экземпляр QueryClient
const queryClient = new QueryClient()

// Регистрируем типы роутера для HMR и автодополнения
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    // <StrictMode> // Временно комментируем StrictMode
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    // </StrictMode>, // Временно комментируем StrictMode
  )
}
