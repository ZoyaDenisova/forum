import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Navigate } from '@tanstack/react-router';
// import { Spinner } from '@/components/ui/spinner'; // Предполагаем, что есть такой компонент, пока закомментировано

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        {/* <Spinner size="large" /> */}
        <div>Загрузка...</div> {/* Заглушка вместо Spinner */}
      </div>
    );
  }

  if (!isAuthenticated) {
    // Если пользователь не аутентифицирован, отправляем на логин
    // Сохраняем текущий путь, чтобы после логина можно было вернуться
    return <Navigate to="/login" search={{ redirect: window.location.pathname + window.location.search }} replace />;
  }

  if (user?.role !== 'admin') {
    // Если пользователь аутентифицирован, но не админ, отправляем на главную
    // или можно на специальную страницу "Доступ запрещен"
    return <Navigate to="/" replace />;
  }

  // Если пользователь админ, показываем дочерний компонент (страницу)
  return <>{children}</>;
}

// Альтернативный вариант, если AdminRouteGuard используется как HOC, а не как layout route в TanStack Router
// export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
//   const { user, isAuthenticated, isLoading } = useAuth();

//   if (isLoading) {
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <Spinner size="large" />
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Navigate to="/login" search={{ redirect: window.location.pathname + window.location.search }} replace />;
//   }

//   if (user?.role !== 'admin') {
//     return <Navigate to="/" replace />;
//   }

//   return <>{children}</>;
// } 