import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  loginUser as apiLoginUser,
  registerUser as apiRegisterUser,
  logoutUserOnServer as apiLogoutUserOnServer,
  fetchCurrentUser as apiFetchCurrentUser, // Заменяем apiGetMe на fetchCurrentUser
  updateUserProfile as apiUpdateUserProfile,
  listUserSessions as apiListUserSessions,
  revokeAllUserSessions as apiRevokeAllUserSessions
} from '@/app/api/auth'; 
import type { User, LoginRequest, RegisterRequest, TokenResponse, UpdateUserRequest, SessionResponse } from '@/types/auth';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateProfile: (data: UpdateUserRequest) => Promise<void>;
  getUserSessions: () => Promise<SessionResponse[]>;
  revokeOtherSessions: () => Promise<void>;
  // TODO: Add methods for refreshToken, updateUserProfile etc. later
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'accessToken';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    return {
      accessToken: storedToken,
      user: null, 
      isLoading: !!storedToken, // true, если есть токен, так как будем пытаться загрузить пользователя
      error: null,
      isAuthenticated: false, // Станет true после успешной загрузки пользователя
    };
  });

  useEffect(() => {
    const loadUser = async () => {
      if (authState.accessToken && !authState.user) {
        if (!authState.isLoading) setAuthState(prev => ({ ...prev, isLoading: true }));
        try {
          // Используем fetchCurrentUser(), который не требует токен как аргумент
          const userData = await apiFetchCurrentUser(); 
          if (userData) { // Проверяем, что userData не null
            setAuthState(prev => ({ 
              ...prev, 
              user: userData, 
              isLoading: false, 
              isAuthenticated: true,
              error: null 
            }));
          } else {
            // Если userData null (например, токен невалиден и fetchCurrentUser его удалил)
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setAuthState({
              accessToken: null, user: null, isLoading: false, error: new Error('Не удалось загрузить пользователя, токен невалиден.'), isAuthenticated: false
            });
          }
        } catch (err) {
          console.error("AuthContext: Failed to load user", err);
          localStorage.removeItem(AUTH_TOKEN_KEY); 
          setAuthState({
            accessToken: null, user: null, isLoading: false, error: err as Error, isAuthenticated: false
          });
        }
      }
      if (!authState.accessToken && authState.isLoading) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };
    loadUser();
  }, [authState.accessToken]);

  const login = async (payload: LoginRequest) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null, isAuthenticated: false, user: null, accessToken: null }));
    try {
      const tokenResponse: TokenResponse = await apiLoginUser(payload);
      // localStorage.setItem(AUTH_TOKEN_KEY, tokenResponse.access_token); // Это делается внутри apiLoginUser
      // setAuthState вызовет useEffect, который загрузит пользователя
      setAuthState(prev => ({ 
        ...prev, 
        accessToken: tokenResponse.access_token, 
      }));
    } catch (err) {
      // localStorage.removeItem(AUTH_TOKEN_KEY); // Это делается внутри apiLoginUser или fetchCurrentUser при ошибке
      setAuthState(prev => ({ ...prev, isLoading: false, error: err as Error, isAuthenticated: false, user: null, accessToken: null }));
      throw err; 
    }
  };

  const register = async (payload: RegisterRequest) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiRegisterUser(payload);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: err as Error }));
      throw err;
    }
  };

  const logout = async () => {
    // Сохраняем текущий токен перед тем, как пытаться его инвалидировать на сервере,
    // на случай, если это понадобится для запроса (хотя для logoutUserOnServer это не так).
    // const currentToken = authState.accessToken;

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Шаг 1: Попытаться инвалидировать сессию на сервере.
      // logoutUserOnServer теперь async и может выбросить ошибку, если fetch упадет.
      await apiLogoutUserOnServer(); 
    } catch (serverError) {
      // Логируем ошибку серверного разлогина, но продолжаем клиентский.
      // Эта ошибка не должна препятствовать выходу пользователя из приложения на клиенте.
      console.warn("Ошибка при попытке завершения сессии на сервере:", serverError);
    } finally {
      // Шаг 2: Независимо от успеха/ошибки на сервере, очищаем состояние на клиенте.
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setAuthState({
        accessToken: null,
        user: null,
        isLoading: false, // Завершаем загрузку
        error: null, // Сбрасываем любые предыдущие ошибки AuthContext
        isAuthenticated: false,
      });
      // После изменения isAuthenticated на false, useEffect в ProfilePage должен вызвать navigate.
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!authState.accessToken || !authState.user) { 
      const error = new Error('Пользователь не аутентифицирован или данные пользователя не загружены.');
      setAuthState(prev => ({ ...prev, error, isLoading: false })); 
      throw error;
    }
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiUpdateUserProfile({ 
        name: authState.user.name, 
        email: authState.user.email, 
        password: newPassword 
      });
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: err as Error }));
      throw err;
    }
  };

  const updateProfile = async (data: UpdateUserRequest) => {
    if (!authState.accessToken || !authState.user) {
      const error = new Error('Пользователь не аутентифицирован или данные пользователя не загружены.');
      setAuthState(prev => ({ ...prev, error, isLoading: false }));
      throw error;
    }
    const payload: UpdateUserRequest = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.email !== undefined) payload.email = data.email;

    if (Object.keys(payload).length === 0) {
        return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiUpdateUserProfile(payload);
      const updatedUser = { ...authState.user, ...payload };
      setAuthState(prev => ({ 
        ...prev, 
        user: updatedUser as User, 
        isLoading: false 
      }));
    } catch (err) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: err as Error }));
      throw err;
    }
  };

  const getUserSessions = async (): Promise<SessionResponse[]> => {
    if (!authState.accessToken) {
      throw new Error('Пользователь не аутентифицирован для получения сессий.');
    }
    try {
      return await apiListUserSessions();
    } catch (err) {
      console.error("AuthContext: Failed to fetch user sessions", err);
      throw err;
    }
  };

  const revokeOtherSessions = async () => {
    if (!authState.accessToken) {
      const error = new Error('Пользователь не аутентифицирован.');
      setAuthState(prev => ({ ...prev, error, isLoading: false }));
      throw error;
    }
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiRevokeAllUserSessions();
      // toast.success здесь не нужен, так как logout перенаправит, и тост может не успеть отобразиться
      // Важно, что logout будет вызван
      await logout(); 
    } catch (err) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: err as Error }));
      // toast.error((err as Error).message || 'Ошибка при завершении сессий.'); // Аналогично, тост может не успеть
      throw err; // Передаем ошибку дальше, чтобы компонент мог ее обработать, если нужно
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout, changePassword, updateProfile, getUserSessions, revokeOtherSessions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 