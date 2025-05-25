import { createFileRoute, useParams } from '@tanstack/react-router';
import { CreateTopicForm } from '@/app/components/forum/CreateTopicForm';

export const Route = createFileRoute('/categories/$categoryId/topics/new')({
  beforeLoad: ({ location, params }) => { // Добавляем params для доступа к categoryId
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return {
        redirect: {
          to: '/login',
          search: {
            // При редиректе на логин, если мы хотим вернуться СЮДА ЖЕ после логина,
            // нужно сохранить и categoryId. Но search параметры не поддерживают вложенность напрямую.
            // Проще всего сохранить полный текущий путь.
            redirect: location.href, 
          },
        },
      };
    }
    // Можно также проверить, валиден ли categoryId (например, что он не пустой), но это опционально здесь.
    return {}; 
  },
  component: CreateTopicForCategoryPage,
});

function CreateTopicForCategoryPage() {
  const { categoryId } = useParams({ from: '/categories/$categoryId/topics/new' });
  return <CreateTopicForm initialCategoryId={categoryId} />;
} 