import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTopicsByCategoryId, deleteTopic as deleteTopicApi } from '@/app/api/forum'
import type { Topic } from '@/types/forum'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { useAuth } from '@/app/contexts/AuthContext'
import { toast } from "sonner"
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export const Route = createFileRoute('/categories/$categoryId/')({
  component: CategoryIndexPage,
})

function CategoryIndexPage() {
  const { categoryId } = useParams({ from: '/categories/$categoryId/' })
  const auth = useAuth();
  const queryClient = useQueryClient();

  const { data: topics, isLoading: isLoadingTopics, error: topicsError } = useQuery<Topic[], Error>({
    queryKey: ['topics', categoryId],
    queryFn: () => fetchTopicsByCategoryId(categoryId!),
    enabled: !!categoryId,
  })

  const deleteTopicMutation = useMutation({
    mutationFn: (topicId: string) => deleteTopicApi(topicId),
    onSuccess: () => {
      toast.success("Тема успешно удалена");
      queryClient.invalidateQueries({ queryKey: ['topics', categoryId] });
    },
    onError: (error) => {
      toast.error(`Ошибка удаления темы: ${error.message}`);
    },
  });

  const handleDeleteTopic = (topicId: string) => {
    deleteTopicMutation.mutate(topicId);
  };

  if (isLoadingTopics) return <p className="p-4 text-center">Загрузка тем...</p>
  if (topicsError) return <p className="p-4 text-center text-red-500">Ошибка загрузки тем: {topicsError.message}</p>

  const categoryName = `Категория`;

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{categoryName}</h1>
        {auth.isAuthenticated && (
          <Link
            to="/categories/$categoryId/topics/new"
            params={{ categoryId: categoryId! }}
          >
            <Button>Создать новую тему</Button>
          </Link>
        )}
      </div>

      {topics && topics.length > 0 && (
        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic.id} className="flex items-start gap-2">
              <Link
                to="/categories/$categoryId/topics/$topicId"
                params={{ categoryId: categoryId!, topicId: topic.id }}
                className="block flex-grow hover:shadow-lg transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 rounded-lg"
              >
                <Card className="">
                  <CardHeader>
                    <CardTitle>{topic.title}</CardTitle>
                    <CardDescription>
                      Автор: {topic.author} | Создана: {new Date(topic.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="truncate text-sm text-gray-700 dark:text-gray-300">{topic.description}</p>
                  </CardContent>
                </Card>
              </Link>
              {auth.user?.role === 'admin' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="mt-2 flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие необратимо. Тема будет удалена навсегда.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTopic(topic.id)}>
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      )}

      {topics && topics.length === 0 && (
        <p className="p-4 text-center text-gray-500">В этой категории пока нет тем.</p>
      )}
    </div>
  )
} 