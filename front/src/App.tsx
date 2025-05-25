import { Link, Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/app/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { GeneralChatPanel } from './app/components/chat/GeneralChatPanel'
import { MessageSquare, PanelLeftClose, PanelRightClose, LogOut, UserCircle, Home, Settings } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function App() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const chatPanelWidth = 350;
  const navigate = useNavigate();

  const matchRoute = useMatchRoute();
  const isAdminSection = !!matchRoute({ to: '/admin', fuzzy: true });

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/' });
  };

  return (
    <div className={cn("min-h-screen flex flex-col bg-gray-50 dark:bg-black")}>
      <header 
        style={{ height: 'var(--header-app-height, 60px)' }} 
        className="sticky top-0 z-30 p-4 bg-gray-100 dark:bg-gray-800 shadow-md flex-shrink-0 flex items-center justify-between"
      >
        <Link to={isAdminSection ? "/admin" : "/"} className="text-xl font-semibold hover:underline">
          {isAdminSection ? "Админ-панель" : "Форум"}
        </Link>
        <div className="flex items-center space-x-3">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse bg-gray-300 dark:bg-gray-700 rounded-md"></div>
          ) : isAuthenticated ? (
            <>
              {isAdminSection ? (
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/' })}>
                  <Home className="h-4 w-4 mr-2" />
                  На сайт
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/profile' })}>
                  <UserCircle className="h-4 w-4 mr-2" />
                  {user?.name || 'Профиль'}
                </Button>
              )}
              {user?.role === 'admin' && !isAdminSection && (
                 <Button variant="outline" size="sm" onClick={() => navigate({ to: '/admin' })}>
                   <Settings className="h-4 w-4 mr-2" />
                   Админка
                 </Button>
              )}
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" size="sm" onClick={() => navigate({ to: '/login' })}>
                Войти
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate({ to: '/register' })}>
                Регистрация
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsChatPanelOpen(!isChatPanelOpen)} 
            className="ml-2"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <div className="flex flex-grow">
        <main className={cn(
          "flex-grow p-4 flex flex-col transition-all duration-300 ease-in-out"
        )}>
          <Outlet />
        </main>
        <aside
          className={cn(
            "relative flex-shrink-0 transition-all duration-300 ease-in-out",
          )}
          style={{ width: isChatPanelOpen ? `${chatPanelWidth}px` : '0px' }}
        >
          <div
            className={cn(
              "sticky transition-transform duration-300 ease-in-out z-20 bg-card border-l shadow-lg overflow-y-auto",
              isChatPanelOpen ? "translate-x-0" : "translate-x-full",
            )}
            style={{
              top: 'var(--header-app-height, 60px)',
              height: 'calc(100vh - var(--header-app-height, 60px))',
            }}
          >
            <GeneralChatPanel />
          </div>
        </aside>
      </div>

      {/* <footer 
        style={{ height: 'var(--footer-height, 70px)' }} 
        className="p-4 bg-gray-200 dark:bg-gray-700 text-center flex-shrink-0 z-20 relative"
      >
        <p>© 2024 Форум</p>
      </footer> */}
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default App;
