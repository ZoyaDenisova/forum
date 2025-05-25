import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect, useState, useRef } from 'react'
import {
  fetchTopicById,
  fetchMessagesByTopicId,
  sendTopicMessage,
  editTopicMessage as editTopicMessageApi,
  deleteTopicMessage as deleteTopicMessageApi,
  editTopic as editTopicInApi,
  deleteTopic as deleteTopicInApi,
  connectToTopicWebSocket,
} from '@/app/api/forum'
import type { Topic, TopicMessage } from '@/types/forum'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/app/contexts/AuthContext'
import { toast } from "sonner"
import { Pencil, Trash2 } from 'lucide-react'
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

export const Route = createFileRoute('/categories/$categoryId/topics/$topicId')({
  component: TopicPage,
})

// Функция для загрузки данных темы (можно вынести в loader роута, но пока оставим так для простоты)
async function loader({ params }: { params: { topicId: string } }) {
  // Здесь можно добавить prefetching или обработку ошибок, если тема не найдена
  const topic = await fetchTopicById(params.topicId)
  if (!topic) {
    // Можно выбросить ошибку, которую обработает ErrorComponent роута
    // throw new Error('Тема не найдена');
    // Или вернуть специальное значение
    return { topic: null, error: 'Тема не найдена' }
  }
  return { topic }
}

// Для демонстрации, как можно было бы использовать loader
// export const Route = createFileRoute('/categories/$categoryId/topics/$topicId')({
//   component: TopicPage,
//   loader: loader,
//   // errorComponent: ({ error }) => <p>Произошла ошибка: {error.message}</p>,
//   // pendingComponent: () => <p>Загрузка темы...</p>,
// })

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ДАТЫ ИЗ WEBSOCKET ---
function normalizeIsoDateString(iso: string): string {
  if (typeof iso !== 'string') return '';
  // Приводим "2025-05-25T18:05:54.353539Z" к "2025-05-25T18:05:54.353Z"
  return iso.replace(/(\.\d{3})\d*(Z)/, '$1$2');
}

function TopicPage() {
  const { categoryId, topicId } = useParams({ from: '/categories/$categoryId/topics/$topicId' });
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [newMessageContent, setNewMessageContent] = useState('');
  const [messages, setMessages] = useState<TopicMessage[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [showNewMessagesNotification, setShowNewMessagesNotification] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  // Состояния для редактирования сообщения
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // --- Новые состояния для редактирования топика ---
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editingTopicTitle, setEditingTopicTitle] = useState('');
  const [editingTopicDescription, setEditingTopicDescription] = useState('');
  const navigate = useNavigate();

  const { data: topicData, isLoading: isLoadingTopic, error: topicError } = useQuery<Topic | undefined | null, Error>({
    queryKey: ['topic', topicId],
    queryFn: () => fetchTopicById(topicId!),
    enabled: !!topicId,
  });
  const topic = topicData;

  const { data: initialMessages, isLoading: isLoadingMessages } = useQuery<TopicMessage[], Error>({
    queryKey: ['topicMessages', topicId],
    queryFn: () => fetchMessagesByTopicId(topicId!),
    enabled: !!topicId,
    // Загружаем начальные сообщения только один раз
    staleTime: Infinity,
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Мутация для редактирования сообщения
  const editMessageMutation = useMutation({
    mutationFn: (payload: { messageId: string; newContent: string }) => 
      editTopicMessageApi({ topicId: topicId!, messageId: payload.messageId, newContent: payload.newContent }),
    onSuccess: (_, variables) => {
      toast.success("Сообщение успешно обновлено");
      // Обновляем только content у сообщения с нужным id
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === variables.messageId ? { ...msg, content: variables.newContent } : msg
      ));
      setEditingMessageId(null);
    },
    onError: (error) => {
      toast.error("Ошибка редактирования: " + error.message);
    },
  });

  // Мутация для удаления сообщения
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => deleteTopicMessageApi(topicId!, messageId),
    onSuccess: (_, messageId) => {
      toast.success("Сообщение успешно удалено");
      // Удаляем сообщение из локального состояния
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    },
    onError: (error) => {
      toast.error("Ошибка удаления: " + error.message);
    },
  });

  // --- Мутация для редактирования топика ---
  const editTopicMutation = useMutation({
    mutationFn: (payload: { title: string; description: string }) =>
      editTopicInApi(topicId!, payload),
    onSuccess: () => {
      toast.success('Топик успешно обновлён');
      queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
      setIsEditingTopic(false);
    },
    onError: (error: any) => {
      toast.error('Ошибка редактирования топика: ' + error.message);
    },
  });

  // --- Мутация для удаления топика ---
  const deleteTopicMutation = useMutation({
    mutationFn: () => deleteTopicInApi(topicId!),
    onSuccess: () => {
      toast.success('Топик успешно удалён');
      navigate({ to: `/categories/${categoryId}` });
    },
    onError: (error: any) => {
      toast.error('Ошибка удаления топика: ' + error.message);
    },
  });

  const handleStartEdit = (message: TopicMessage) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !editingContent.trim()) return;
    editMessageMutation.mutate({ messageId: editingMessageId, newContent: editingContent.trim() });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessageMutation.mutate(messageId);
  };

  // --- Обработчики для редактирования топика ---
  const handleStartEditTopic = () => {
    setEditingTopicTitle(topic?.title || '');
    setEditingTopicDescription(topic?.description || '');
    setIsEditingTopic(true);
  };
  const handleCancelEditTopic = () => {
    setIsEditingTopic(false);
    setEditingTopicTitle('');
    setEditingTopicDescription('');
  };
  const handleSaveTopic = () => {
    if (!editingTopicTitle.trim() || !editingTopicDescription.trim()) return;
    editTopicMutation.mutate({
      title: editingTopicTitle.trim(),
      description: editingTopicDescription.trim(),
    });
  };
  const handleDeleteTopic = () => {
    deleteTopicMutation.mutate();
  };

  useEffect(() => {
    if (!topicId) return;
    // Подключаемся к WebSocket для получения новых сообщений
    const disconnect = connectToTopicWebSocket(topicId, {
      onMessage: (wsData: any) => {
        console.log('wsData', wsData);
        // wsData: { action: 'created'|'updated'|'deleted', message, message_id }
        if (wsData.action === 'created' && wsData.message) {
          const msg = {
            id: String(wsData.message.ID ?? wsData.message.id),
            topicId: String(wsData.message.TopicID ?? wsData.message.topicId),
            author: String(wsData.message.AuthorID ?? wsData.message.author_id ?? wsData.message.author),
            authorName: wsData.message.authorName ?? wsData.message.author_name ?? '',
            content: wsData.message.Content ?? wsData.message.content,
            createdAt: normalizeIsoDateString(wsData.message.createdAt ?? wsData.message.created_at),
          };
          console.log('msg', msg);
          setMessages((prevMessages) => {
            if (prevMessages.find(m => m.id === msg.id)) return prevMessages;
            const updatedMessages = [...prevMessages, msg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setTimeout(() => {
              if (auth.user && String(msg.author) === String(auth.user.id)) return;
              const scrollThreshold = 10;
              let isAtBottom = false;
              if (messagesEndRef.current) {
                const rect = messagesEndRef.current.getBoundingClientRect();
                isAtBottom = rect.bottom <= window.innerHeight + scrollThreshold;
              }
              if (!isAtBottom) {
                setShowNewMessagesNotification(true);
                setNewMessagesCount((count) => count + 1);
              } else {
                scrollToBottom();
              }
            }, 0);
            return updatedMessages;
          });
        } else if (wsData.action === 'updated' && wsData.message) {
          const msg = {
            id: String(wsData.message.ID ?? wsData.message.id),
            topicId: String(wsData.message.TopicID ?? wsData.message.topicId),
            author: String(wsData.message.AuthorID ?? wsData.message.author_id ?? wsData.message.author),
            authorName: wsData.message.authorName ?? wsData.message.author_name ?? '',
            content: wsData.message.Content ?? wsData.message.content,
            createdAt: normalizeIsoDateString(wsData.message.createdAt ?? wsData.message.created_at),
          };
          setMessages((prevMessages) => prevMessages.map(m => m.id === msg.id ? msg : m));
        } else if (wsData.action === 'deleted' && wsData.message_id) {
          setMessages((prevMessages) => prevMessages.filter(m => m.id !== String(wsData.message_id)));
        }
      },
      onError: (e) => {
        console.error('WebSocket error', e);
      },
    });
    return () => {
      disconnect();
    };
  }, [topicId]);
  
  const scrollToBottom = (smooth: boolean = false) => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
    setShowNewMessagesNotification(false);
    setNewMessagesCount(0);
  };

  useEffect(() => {
    const handleManualScroll = () => {
      const scrollThresholdForManualDismiss = 10;
      const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - scrollThresholdForManualDismiss);

      if (isAtBottom) {
        setShowNewMessagesNotification(false);
        setNewMessagesCount(0);
      }
    };

    if (showNewMessagesNotification) {
      window.addEventListener('scroll', handleManualScroll);
      return () => {
        window.removeEventListener('scroll', handleManualScroll);
      };
    }
  }, [showNewMessagesNotification]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !topicId) return;

    try {
      // Используем имя пользователя из AuthContext
      await sendTopicMessage(topicId, { author: auth.user?.name || 'Аноним', content: newMessageContent.trim() });
      setNewMessageContent('');
      // --- автоскролл вниз после отправки своего сообщения ---
      setTimeout(() => scrollToBottom(true), 0);
      // --- конец автоскролла ---
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
      toast.error("Ошибка отправки сообщения: " + (err as Error).message);
    }
  };

  if (isLoadingTopic) return <p className="pt-2 sm:p-4">Загрузка темы...</p>;
  if (topicError) return <p className="pt-2 sm:p-4 text-red-500">Ошибка загрузки темы: {topicError.message}</p>;
  if (!topic) return <p className="pt-2 sm:p-4">Тема не найдена.</p>;

  return (
    <div className="flex flex-col h-full pt-2">
      <div className="space-y-6 flex-grow pb-8">
        <Card className="flex-shrink-0">
          <CardHeader className="relative">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {isEditingTopic ? (
                  <Input
                    value={editingTopicTitle}
                    onChange={e => setEditingTopicTitle(e.target.value)}
                    className="text-2xl md:text-3xl font-bold mb-2"
                  />
                ) : (
                  <CardTitle className="text-2xl md:text-3xl">{topic.title}</CardTitle>
                )}
                <CardDescription>
                  Автор: {topic.authorName} | Создана: {new Date(topic.createdAt).toLocaleString()}
                </CardDescription>
              </div>
              {/* Кнопки редактирования и удаления топика */}
              {((auth.user?.role === 'admin') || (auth.user?.id && String(topic.author) === String(auth.user.id))) && !isEditingTopic && (
                <div className="flex gap-1 mt-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 p-1" onClick={handleStartEditTopic} title="Редактировать топик">
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 p-1 text-destructive hover:text-destructive" title="Удалить топик">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить топик?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие необратимо. Все сообщения в топике также будут удалены.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTopic} disabled={deleteTopicMutation.isPending}>
                          {deleteTopicMutation.isPending ? 'Удаление...' : 'Удалить'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
            {isEditingTopic && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSaveTopic} disabled={editTopicMutation.isPending || !editingTopicTitle.trim() || !editingTopicDescription.trim()}>
                  {editTopicMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelEditTopic} disabled={editTopicMutation.isPending}>
                  Отмена
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditingTopic ? (
              <Textarea
                value={editingTopicDescription}
                onChange={e => setEditingTopicDescription(e.target.value)}
                rows={4}
                className="w-full text-base"
              />
            ) : (
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{topic.description}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 md:mt-8 flex-grow flex flex-col min-h-0 relative">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Обсуждение</CardTitle>
          </CardHeader>
          <div className="flex flex-col">
            <CardContent className="p-0">
              <div className="p-4 space-y-3">
                {isLoadingMessages && messages.length === 0 && <p>Загрузка сообщений...</p>}
                {!isLoadingMessages && messages.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">Сообщений пока нет. Будьте первым!</p>
                )}
                {messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-lg shadow-sm flex flex-col max-w-[85%] break-words group relative ${ 
                      !!auth.user?.id && String(msg.author) === String(auth.user.id)
                        ? 'bg-primary/10 dark:bg-primary/20 ml-auto items-end'
                        : 'bg-muted/50 dark:bg-muted/20 mr-auto items-start'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <p className={`text-sm font-semibold mb-1 ${ 
                          !!auth.user?.id && String(msg.author) === String(auth.user.id) ? 'text-primary' : 'text-foreground/80'
                        }`}>
                        {msg.authorName || `Пользователь #${msg.author}`}
                        {topic && msg.author === topic.author && (
                          <span className="ml-1.5 text-xs font-normal text-green-600 dark:text-green-400">(Автор)</span>
                        )}
                      </p>
                      {/* Кнопка редактирования только для автора, кнопка удаления — для автора и админа */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {(!!auth.user?.id && String(msg.author) === String(auth.user.id)) && editingMessageId !== msg.id && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5" onClick={() => handleStartEdit(msg)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {(auth.user?.role === 'admin' || (!!auth.user?.id && String(msg.author) === String(auth.user.id))) && editingMessageId !== msg.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие необратимо. Сообщение будет удалено навсегда.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {editingMessageId === msg.id ? (
                      <div className='w-full mt-1'>
                        <Textarea 
                          value={editingContent} 
                          onChange={(e) => setEditingContent(e.target.value)} 
                          rows={3}
                          className='w-full text-sm'
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Отмена</Button>
                          <Button size="sm" onClick={handleSaveEdit} disabled={editMessageMutation.isPending || !editingContent.trim()}>
                            {editMessageMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5 self-end">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </div>
          <CardFooter className="sticky bottom-0 bg-card border-t p-3 z-10">
            {auth.user ? (
              <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
                <Input 
                  type="text" 
                  placeholder="Ваше сообщение..."
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  className="flex-grow"
                />
                <Button type="submit" className="flex-shrink-0">Отправить</Button> 
              </form>
            ) : (
              <div className="w-full text-center text-muted-foreground py-2">
                <span>Чтобы отправлять сообщения, <a href="/login" className="text-primary underline">войдите</a> или <a href="/register" className="text-primary underline">зарегистрируйтесь</a>.</span>
              </div>
            )}
            {showNewMessagesNotification && (
              <div className="absolute bottom-[85px] right-4 z-20 md:bottom-[80px]">
                <Button 
                  onClick={() => scrollToBottom(true)} 
                  variant="secondary" 
                  className="shadow-lg animate-bounce relative pr-3"
                >
                  Новые сообщения &darr;
                  {newMessagesCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-background">
                      {newMessagesCount}
                    </span>
                  )}
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 