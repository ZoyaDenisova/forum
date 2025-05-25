import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCategories, addCategory, deleteCategory } from '@/app/api/forum'
import type { Category } from '@/types/forum'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { useAuth } from '@/app/contexts/AuthContext'
import { Trash2 } from 'lucide-react'
import { AddCategoryForm } from '@/app/components/admin/AddCategoryForm'
import { toast } from 'sonner'
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
import React from 'react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { data: categories, isLoading: isLoadingCategories, error: categoriesError } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const addCategoryMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      return addCategory({ name, description })
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(`Категория "${newCategory.name}" успешно добавлена!`)
    },
    onError: (error) => {
      toast.error(`Ошибка добавления категории: ${error.message}`)
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (data, categoryId) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(`Категория (ID: ${categoryId}) успешно удалена.`)
    },
    onError: (error, categoryId) => {
      toast.error(`Ошибка удаления категории (ID: ${categoryId}): ${error.message}`)
    },
  })

  if (isLoadingCategories) return <p className="p-4 text-center">Загрузка категорий...</p>
  if (categoriesError) return <p className="p-4 text-center text-red-500">Ошибка загрузки категорий: {categoriesError.message}</p>

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Категории</h1>
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <AddCategoryForm 
              onAddCategory={async (name, description) => { 
                await addCategoryMutation.mutateAsync({ name, description })
              }}
              isLoading={addCategoryMutation.isPending}
            />
          )}
          {isAuthenticated && (
            <Link to="/topics/new">
              <Button>Создать новую тему</Button>
            </Link>
          )}
        </div>
      </div>
      
      {categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="relative">
              <Link 
                to="/categories/$categoryId"
                params={{ categoryId: category.id }}
                className="block hover:shadow-lg transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 rounded-lg"
              >
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{category.description || 'Нет описания'}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity"
                      title="Удалить категорию"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Вы действительно хотите удалить категорию "<b>{category.name}</b>"?
                        Это действие необратимо.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id}>
                        Отмена
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteCategoryMutation.mutate(category.id)} 
                        disabled={deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id}
                      >
                        {deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id ? 'Удаление...' : 'Удалить'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">Категории еще не созданы.</p>
          {isAdmin && (
            <AddCategoryForm 
              onAddCategory={async (name, description) => { 
                await addCategoryMutation.mutateAsync({ name, description })
              }}
              isLoading={addCategoryMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  )
} 