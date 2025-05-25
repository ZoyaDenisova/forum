import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Админ-панель
      </h1>
      <p className="text-gray-700 mb-4">
        Основной раздел администрирования.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link 
          to="/admin/users" 
          className="block p-6 bg-blue-50 hover:bg-blue-100 rounded-lg shadow text-blue-700 hover:text-blue-800 transition-colors duration-150"
        >
          <h2 className="text-lg font-semibold">Управление пользователями</h2>
          <p className="text-sm mt-1">Просмотр списка всех зарегистрированных пользователей и управление ими.</p>
        </Link>
        
        {/* Можно оставить место для других чисто админских функций, если появятся */}
        {/* <div className="block p-6 bg-gray-50 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800">Другой раздел (скоро)</h2>
          <p className="text-sm text-gray-600 mt-1">Описание другого раздела.</p>
        </div> */}
      </div>
    </div>
  );
} 