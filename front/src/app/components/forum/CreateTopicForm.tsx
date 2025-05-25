import { useNavigate, useParams } from '@tanstack/react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { fetchCategories, addTopic as apiAddTopic } from '@/app/api/forum';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Category, Topic } from '@/types/forum';
import { useEffect } from 'react';

const createTopicSchema = z.object({
  title: z.string().min(5, 'Заголовок должен быть не менее 5 символов').max(100, 'Заголовок не должен превышать 100 символов'),
  description: z.string().min(10, 'Описание должно быть не менее 10 символов').max(5000, 'Описание не должно превышать 5000 символов'),
  categoryId: z.string().nonempty('Выберите категорию'),
});

type CreateTopicFormValues = z.infer<typeof createTopicSchema>;

interface CreateTopicFormProps {
  initialCategoryId?: string;
}

export function CreateTopicForm({ initialCategoryId }: CreateTopicFormProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();

  const { data: categories, isLoading: isLoadingCategories, error: categoriesError } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const mutation = useMutation<
    Topic,
    Error,
    CreateTopicFormValues
  >({
    mutationFn: async (newTopicData) => {
      if (!auth.user) throw new Error('Пользователь не авторизован для создания темы.');
      return apiAddTopic(newTopicData);
    },
    onSuccess: (data) => {
      toast.success('Тема успешно создана!');
      queryClient.invalidateQueries({ queryKey: ['topics', data.categoryId] });
      navigate({ to: '/categories/$categoryId/topics/$topicId', params: { categoryId: data.categoryId, topicId: data.id } });
    },
    onError: (error) => {
      toast.error(`Ошибка при создании темы: ${error.message}`);
    },
  });

  // @ts-expect-error 
  const form = useForm<CreateTopicFormValues, typeof zodValidator>({
    defaultValues: {
      title: '',
      description: '',
      categoryId: initialCategoryId || '',
    },
    validatorAdapter: zodValidator,
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    },
  });

 useEffect(() => {
    if (initialCategoryId) {
      form.setFieldValue('categoryId', initialCategoryId);
    }
  }, [initialCategoryId, form]);

  if (auth.isLoading) {
    return <p className="p-4 text-center">Загрузка данных пользователя...</p>;
  }

  if (!auth.isAuthenticated || !auth.user) {
    return <p className="p-4 text-center">Требуется авторизация. Пожалуйста, войдите.</p>;
  }
  
  if (isLoadingCategories) {
    return <p className="p-4 text-center">Загрузка категорий...</p>;
  }

  if (categoriesError) {
    return <p className="p-4 text-center text-red-500">Ошибка загрузки категорий: {categoriesError.message}</p>;
  }

  const renderErrors = (errors: unknown[] | undefined) => {
    if (!errors || errors.length === 0) return null;
    return (
      <p className="mt-1 text-sm text-red-500">
        {errors.map((err, index) => {
          if (typeof err === 'string') return <span key={index}>{err}</span>;
          if (err && typeof err === 'object' && 'message' in err) return <span key={index}>{(err as { message: string }).message}</span>;
          return <span key={index}>Неизвестная ошибка валидации</span>;
        }).reduce((prev, curr, i) => <>{prev}{i > 0 && ', '}{curr}</>, <></>)}
      </p>
    );
  };

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Создать новую тему</CardTitle>
          <CardDescription>
            Заполните детали вашей новой темы. Поля, отмеченные звездочкой (*), обязательны.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <form.Field
              name="title"
              validators={{onChange: createTopicSchema.shape.title}}
              children={(field: any) => (
                <div>
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Заголовок темы <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Введите заголовок вашей темы"
                    className="mt-1"
                  />
                  {renderErrors(field.state.meta.errors)}
                </div>
              )}
            />

            <form.Field
              name="categoryId"
              validators={{onChange: createTopicSchema.shape.categoryId}} 
              children={(field: any) => (
                <div>
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Категория <span className="text-red-500">*</span>
                  </label>
                  <Select 
                    name={field.name}
                    value={field.state.value}
                    onValueChange={(value: string) => field.handleChange(value)}
                    disabled={isLoadingCategories}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderErrors(field.state.meta.errors)}
                </div>
              )}
            />

            <form.Field
              name="description"
              validators={{onChange: createTopicSchema.shape.description}}
              children={(field: any) => (
                <div>
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Описание темы <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Подробно опишите суть вашей темы"
                    rows={6}
                    className="mt-1"
                  />
                  {renderErrors(field.state.meta.errors)}
                </div>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending || !form.state.canSubmit}>
                {mutation.isPending ? 'Создание...' : 'Создать тему'}
              </Button>
            </div>
             {form.state.isSubmitted && !form.state.isValid && (
                <p className="text-sm text-red-500 text-center">Пожалуйста, исправьте ошибки в форме.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 