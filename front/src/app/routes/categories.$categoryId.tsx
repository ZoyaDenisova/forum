import { createFileRoute, useParams, Link, Outlet, useMatches } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchCategoryById } from '@/app/api/forum'
import type { Category } from '@/types/forum'
// Компоненты Card здесь больше не нужны, они в index.tsx и $topicId.tsx
// Хлебные крошки
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export const Route = createFileRoute('/categories/$categoryId')({
  component: CategoryLayoutPage, // Переименовываем компонент для ясности
})

function CategoryLayoutPage() {
  const { categoryId } = useParams({ from: '/categories/$categoryId' })
  const matches = useMatches();
  
  // Ищем активный матч, который соответствует пути темы
  // params в match может быть типизирован через Route.types.allParams или быть unknown
  const currentTopicMatch = matches.find(
    (match) => typeof match.routeId === 'string' && match.routeId.includes('/topics/')
  );
  const topicId = (currentTopicMatch?.params as { topicId?: string })?.topicId;

  const { data: category, isLoading: isLoadingCategory } = useQuery<Category | undefined, Error>({
    queryKey: ['category', categoryId],
    queryFn: () => fetchCategoryById(categoryId!),
    enabled: !!categoryId, 
  })
  
  // Загрузка списка тем теперь происходит в categories.$categoryId.index.tsx

  if (isLoadingCategory && !category) return (
    <div className="p-4 flex-grow"><p>Загрузка данных категории...</p></div>
  );

  return (
    <div className="container mx-auto flex flex-col flex-grow min-h-0">
      <Breadcrumb className="mb-4 p-4 pb-0 md:p-0 md:pb-0 md:mb-6 flex-shrink-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Главная</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {category && !topicId ? (
              <BreadcrumbPage>{category.name}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link 
                  to="/categories/$categoryId"
                  params={{ categoryId: categoryId! }}
                  activeOptions={{ exact: !topicId }}
                >
                  {category ? category.name : `Категория ${categoryId}`}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {topicId && category && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Тема {topicId}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex-grow min-h-0 px-4 pb-4 md:px-0 md:pb-0">
          <Outlet />
      </div>
    </div>
  )
} 