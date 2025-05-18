import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { AdminRouteGuard } from '@/app/components/auth/AdminRouteGuard';

// Создаем layout-маршрут для /admin
// Все дочерние маршруты (например, /admin/users, /admin/categories) будут рендериться внутри <Outlet /> этого компонента
export const Route = createFileRoute('/admin')({
  component: AdminLayoutComponent,
});

function AdminLayoutComponent() {
  return (
    <AdminRouteGuard>
      <div className="min-h-screen">
        <div className="py-6 md:py-10">
          <main>
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              {/* Содержимое конкретной админ-страницы будет здесь */}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
} 