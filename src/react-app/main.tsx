import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

import * as TanStackQueryProvider from './providers/tanstack-query/root-provider.tsx'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import { ThemeProvider } from './components/theme-provider.tsx'
import { EnsureSession } from './components/EnsureSession.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/Toast.tsx'

// Create a new router instance

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <ToastProvider>
            <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
              {import.meta.env.DEV && (
                <TanStackDevtools
                  plugins={[
                    {
                      name: 'TanStack Query',
                      render: <ReactQueryDevtoolsPanel />,
                    },
                    {
                      name: 'TanStack Router',
                      render: <TanStackRouterDevtoolsPanel router={router} />,
                    },
                  ]}
                />
              )}
              <EnsureSession>
                <RouterProvider router={router} />
              </EnsureSession>
            </TanStackQueryProvider.Provider>
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}
