import { createFileRoute } from '@tanstack/react-router';
import { CreateTopicForm } from '@/app/components/forum/CreateTopicForm';

export const Route = createFileRoute('/topics/new')({
  beforeLoad: ({ location }) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return {
        redirect: {
          to: '/login',
          search: {
            redirect: location.href,
          },
        },
      };
    }
    return {}; 
  },
  component: CreateTopicPage,
});

function CreateTopicPage() {
  return <CreateTopicForm />;
} 