import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useAuth } from '@/app/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { PencilIcon, SaveIcon, XCircleIcon } from 'lucide-react'; // Иконки
import type { SessionResponse } from '@/types/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/profile')({
  beforeLoad: () => {
    const token = localStorage.getItem('accessToken'); // AUTH_TOKEN_KEY из AuthContext, но здесь проще напрямую
    if (!token) {
      throw redirect({
        to: '/login',
        // Можно добавить replace: true, если не хотим, чтобы /profile оставался в истории браузера для неаутентифицированных
      });
    }
    // Если токен есть, ничего не делаем, загрузка компонента продолжается
  },
  component: ProfilePage,
});

// Сначала определяем схему полей
const passwordFieldsSchema = z.object({
  newPassword: z.string().min(8, 'Новый пароль должен содержать не менее 8 символов'),
  confirmNewPassword: z.string(),
});

// Затем применяем refine к ней
const passwordChangeSchema = passwordFieldsSchema.refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Пароли не совпадают",
  path: ["confirmNewPassword"], // Ошибка будет ассоциирована с этим полем
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Имя не может быть пустым'),
  email: z.string().email('Некорректный email'),
});
type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

function ProfilePage() {
  const { 
    user, 
    logout, 
    changePassword, 
    updateProfile, 
    getUserSessions, 
    revokeOtherSessions, 
    isLoading: authIsLoading,
    isAuthenticated 
  } = useAuth();
  const navigate = useNavigate();
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isConfirmRevokeOpen, setIsConfirmRevokeOpen] = useState(false);

  // @ts-expect-error // Игнорируем ошибку типизации для useForm
  const passwordForm = useForm<PasswordChangeFormData>({
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
    onSubmit: async ({ value }) => {
      setPasswordFormError(null);
      try {
        await changePassword(value.newPassword);
        toast.success('Пароль успешно изменен!');
        passwordForm.reset();
      } catch (error) {
        const errorMessage = (error as Error).message || 'Ошибка при смене пароля.';
        setPasswordFormError(errorMessage);
      }
    },
    validatorAdapter: zodValidator,
  });

  // @ts-expect-error // Игнорируем ошибку типизации для useForm
  const profileForm = useForm<ProfileUpdateFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
    onSubmit: async ( { value } ) => {
      setProfileFormError(null);
      if (value.name === user?.name && value.email === user?.email) {
        toast.info('Нет изменений для сохранения.');
        setIsEditingProfile(false); 
        return;
      }
      try {
        await updateProfile(value);
        toast.success('Данные профиля успешно обновлены!');
        setIsEditingProfile(false); 
      } catch (error) {
        const errorMessage = (error as Error).message || 'Ошибка при обновлении профиля.';
        setProfileFormError(errorMessage);
      }
    },
    validatorAdapter: zodValidator,
  });
  
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        email: user.email,
      });

      const fetchSessions = async () => {
        setSessionsLoading(true);
        setSessionsError(null);
        try {
          const data = await getUserSessions();
          setSessions(data);
        } catch (err) {
          setSessionsError((err as Error).message || 'Не удалось загрузить сессии.');
        } finally {
          setSessionsLoading(false);
        }
      };
      fetchSessions();
    }
  }, [user, profileForm, isEditingProfile, getUserSessions]);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      navigate({ to: '/login', replace: true });
    }
  }, [authIsLoading, isAuthenticated, navigate]);

  if (authIsLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Загрузка данных пользователя...</p>
      </div>
    );
  }

  if (!user) {
    // Это состояние не должно возникнуть, если beforeLoad отработал правильно
    // и AuthContext синхронизирован. Но на всякий случай.
    return (
      <div className="p-4">
        <p>Загрузка данных пользователя или произошла ошибка...</p>
        <Link to="/">
          <Button variant="link">На главную</Button>
        </Link>
      </div>
    );
  }

  const handleRevokeSessionsClick = () => {
    setIsConfirmRevokeOpen(true);
  };

  const confirmRevokeSessions = async () => {
    try {
      await revokeOtherSessions();
    } catch (err) {
      toast.error((err as Error).message || 'Не удалось завершить сессии.');
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl sm:text-3xl">Профиль пользователя</CardTitle>
            <CardDescription>
              Информация о вашем аккаунте.
            </CardDescription>
          </div>
          {!isEditingProfile ? (
            <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(true)}>
              <PencilIcon className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => {
                setIsEditingProfile(false);
                profileForm.reset({ name: user.name, email: user.email });
                setProfileFormError(null);
              }}>
                <XCircleIcon className="h-5 w-5 text-destructive" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => profileForm.handleSubmit() } disabled={authIsLoading || profileForm.state.isSubmitting}>
                <SaveIcon className="h-5 w-5 text-primary" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingProfile ? (
            <form
              id="profileEditForm"
              onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); profileForm.handleSubmit(); }}
              className="space-y-4"
            >
              <profileForm.Field
                name="name"
                validators={{ onChange: profileUpdateSchema.shape.name }}
                children={(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Имя</Label>
                    <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
                    {field.state.meta.isTouched && field.state.meta.errors?.length > 0 && <p className="text-sm text-destructive">{field.state.meta.errors.map((err: any) => typeof err === 'string' ? err : (err as {message: string}).message).join(', ')}</p>}
                  </div>
                )}
              />
              <profileForm.Field
                name="email"
                validators={{ onChange: profileUpdateSchema.shape.email }}
                children={(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="email" />
                    {field.state.meta.isTouched && field.state.meta.errors?.length > 0 && <p className="text-sm text-destructive">{field.state.meta.errors.map((err: any) => typeof err === 'string' ? err : (err as {message: string}).message).join(', ')}</p>}
                  </div>
                )}
              />
              {profileFormError && <p className="text-sm text-destructive pt-2">{profileFormError}</p>}
            </form>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Имя:</h3>
                <p className="text-gray-600 dark:text-gray-400">{user.name}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Email:</h3>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              </div>
            </>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Дата регистрации:</h3>
            <p className="text-gray-600 dark:text-gray-400">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Смена пароля</CardTitle>
          <CardDescription>
            Введите новый пароль для вашего аккаунта.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            passwordForm.handleSubmit();
          }}
          className="space-y-6" // Добавим немного отступов для формы
        >
          <CardContent className="space-y-4">
            <passwordForm.Field
              name="newPassword"
              validators={{
                onChange: passwordFieldsSchema.shape.newPassword, // Используем схему полей
              }}
              children={(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Новый пароль</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="password"
                    placeholder="Минимум 8 символов"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map((err: any) => {
                        if (typeof err === 'string') return err;
                        if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
                        return 'Неверное значение';
                      }).join(', ')}
                    </p>
                  )}
                </div>
              )}
            />
            <passwordForm.Field
              name="confirmNewPassword"
               validators={{
                onChange: ({ value, fieldApi }) => {
                  const newPasswordValue = fieldApi.form.getFieldValue('newPassword');
                  if (newPasswordValue !== value) {
                    return 'Пароли не совпадают';
                  }
                  return undefined;
                },
              }}
              children={(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Подтвердите новый пароль</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="password"
                    placeholder="Повторите новый пароль"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length > 0 && (
                     <p className="text-sm text-destructive">
                       {field.state.meta.errors.map((err: any) => {
                        if (typeof err === 'string') return err;
                        if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
                        return 'Неверное значение';
                      }).join(', ')}
                     </p>
                  )}
                </div>
              )}
            />
            {passwordFormError && (
              <p className="text-sm text-destructive pt-2">{passwordFormError}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={authIsLoading || passwordForm.state.isSubmitting}>
              {authIsLoading || passwordForm.state.isSubmitting ? 'Сохранение...' : 'Сменить пароль'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Активные сессии</CardTitle>
          <CardDescription>
            Список ваших текущих сессий. Завершение всех сессий приведет к выходу из системы на всех устройствах.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionsLoading && <p className='text-center p-4'>Загрузка сессий...</p>}
          {sessionsError && 
            <Alert variant="destructive">
              <XCircleIcon className="h-4 w-4" />
              <AlertTitle>Ошибка загрузки сессий</AlertTitle>
              <AlertDescription>{sessionsError}</AlertDescription>
            </Alert>
          }
          {!sessionsLoading && !sessionsError && sessions.length === 0 && 
            <p className='text-center p-4'>Нет активных сессий.</p>
          }
          {!sessionsLoading && !sessionsError && sessions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {/* <TableHead>ID</TableHead> */}{/* ID сессии может быть не очень полезен пользователю */}
                  <TableHead>Устройство/Браузер</TableHead>
                  <TableHead>Дата входа</TableHead>
                  <TableHead>Истекает</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    {/* <TableCell>{session.id}</TableCell> */}
                    <TableCell className="truncate max-w-[200px] sm:max-w-xs">{session.user_agent || 'Неизвестно'}</TableCell>
                    <TableCell>{new Date(session.created_at).toLocaleString()}</TableCell>
                    <TableCell>{new Date(session.expires_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!sessionsLoading && !sessionsError && (
            <CardFooter className="flex justify-end">
                <Button 
                    variant="destructive" 
                    onClick={handleRevokeSessionsClick}
                    disabled={authIsLoading || sessionsLoading}
                >
                    Завершить все сессии
                </Button>
            </CardFooter>
        )}
      </Card>

      <AlertDialog open={isConfirmRevokeOpen} onOpenChange={setIsConfirmRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите действие</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите завершить все ваши сессии? 
              Это действие также завершит вашу текущую сессию, и вам потребуется снова войти в систему.
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmRevokeOpen(false)}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevokeSessions}>
              Завершить все сессии
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
