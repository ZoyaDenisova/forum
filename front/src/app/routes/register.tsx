import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

const registerSchema = z.object({
  name: z.string().min(1, 'Имя не может быть пустым'),
  email: z.string().email('Некорректный email'),
  // Убедись, что minLength для пароля соответствует требованиям API (swagger: minLength: 8)
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'), 
});

type RegisterFormData = z.infer<typeof registerSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const auth = useAuth(); 
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        await auth.register(value); 
        toast.success('Регистрация прошла успешно! Теперь вы можете войти.');
        navigate({ to: '/login' });
      } catch (error) {
        setFormError((error as Error).message || 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.');
      }
    },
    validatorAdapter: zodValidator,
  });

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-app-height)-var(--footer-height)-2rem)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <CardDescription>Создайте новый аккаунт.</CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <CardContent className="space-y-4">
            <form.Field
              name="name"
              validators={{ onChange: registerSchema.shape.name }}
              children={(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Имя</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ваше имя"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length > 0 ? (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map((err) => {
                        if (typeof err === 'string') return err;
                        if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
                        return 'Неверное значение'; // Fallback
                      }).join(', ')}
                    </p>
                  ) : null}
                </div>
              )}
            />
            <form.Field
              name="email"
              validators={{ onChange: registerSchema.shape.email }}
              children={(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="email"
                    placeholder="m@example.com"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length > 0 ? (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map((err) => {
                        if (typeof err === 'string') return err;
                        if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
                        return 'Неверное значение'; // Fallback
                      }).join(', ')}
                    </p>
                  ) : null}
                </div>
              )}
            />
            <form.Field
              name="password"
              validators={{ onChange: registerSchema.shape.password }}
              children={(field) => (
                <div className="space-y-1">
                  <Label htmlFor={field.name}>Пароль</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="password"
                    placeholder="Минимум 8 символов"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length > 0 ? (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map((err) => {
                        if (typeof err === 'string') return err;
                        if (err && typeof err === 'object' && 'message' in err) return (err as { message: string }).message;
                        return 'Неверное значение'; // Fallback
                      }).join(', ')}
                    </p>
                  ) : null}
                </div>
              )}
            />
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit" className="w-full" disabled={auth.isLoading || form.state.isSubmitting}>
              {auth.isLoading || form.state.isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 