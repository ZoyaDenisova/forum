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

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль не может быть пустым'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  // @ts-expect-error // Игнорируем ошибку типизации для useForm
  const form = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        await auth.login(value);
        navigate({ to: '/' });
      } catch (error) {
        console.error("Login error:", error);
        setFormError((error as Error).message || 'Ошибка входа. Пожалуйста, проверьте ваши данные.');
      }
    },
    validatorAdapter: zodValidator,
  });

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-app-height)-var(--footer-height)-2rem)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Вход</CardTitle>
          <CardDescription>Введите ваши данные для входа в аккаунт.</CardDescription>
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
              name="email"
              validators={{
                onChange: loginSchema.shape.email,
              }}
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
                    <p className="text-sm text-red-500">
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
              validators={{
                onChange: loginSchema.shape.password,
              }}
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
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length > 0 ? (
                    <p className="text-sm text-red-500">
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
              <p className="text-sm text-red-500">{formError}</p>
            )}
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit" className="w-full" disabled={auth.isLoading || form.state.isSubmitting}>
              {auth.isLoading || form.state.isSubmitting ? 'Вход...' : 'Войти'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 