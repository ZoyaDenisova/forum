import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect, useState, useRef } from 'react'
import {
  fetchTopicById,
  fetchMessagesByTopicId,
  subscribeToTopicMessages,
  sendTopicMessage,
  editTopicMessage as editTopicMessageApi,
  deleteTopicMessage as deleteTopicMessageApi
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
    onSuccess: (updatedMessage) => {
      toast.success("Сообщение успешно обновлено");
      // Обновляем сообщение в локальном состоянии
      setMessages(prevMessages => prevMessages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg));
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

  useEffect(() => {
    if (!topicId) return;
    console.log(`TopicPage: useEffect for subscribeToTopicMessages - topicId: ${topicId}`); // ОТЛАДКА

    const handleNewMessage = (newMessage: TopicMessage) => {
      console.log('TopicPage: handleNewMessage received:', newMessage); // ОТЛАДКА
      setMessages((prevMessages) => {
        if (prevMessages.find(msg => msg.id === newMessage.id)) {
          return prevMessages.map(msg => msg.id === newMessage.id ? newMessage : msg);
        }
        const updatedMessages = [...prevMessages, newMessage].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const scrollThreshold = 100; 
        const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - scrollThreshold);

        if (!!auth.user?.name && newMessage.author === auth.user.name) { 
          setShowNewMessagesNotification(false);
          setNewMessagesCount(0);
          requestAnimationFrame(() => scrollToBottom(true)); 
        } else {
          if (!isAtBottom) {
            console.log('TopicPage: Incrementing newMessagesCount for message:', newMessage.id); // ОТЛАДКА
            setShowNewMessagesNotification(true);
            setNewMessagesCount(prevCount => prevCount + 1);
          } else {
            setShowNewMessagesNotification(false);
            setNewMessagesCount(0); 
            requestAnimationFrame(() => scrollToBottom(true));
          }
        }
        return updatedMessages;
      });
    };

    const unsubscribe = subscribeToTopicMessages(topicId, handleNewMessage);
    
    // ОТЛАДКА: Лог при отписке
    return () => {
      console.log(`TopicPage: Unsubscribing from topicId: ${topicId}`);
      unsubscribe();
    };
  }, [topicId, auth.user?.name]);
  
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
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">{topic.title}</CardTitle>
            <CardDescription>
              Автор: {topic.author} | Создана: {new Date(topic.createdAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{topic.description}</p>
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
                      !!auth.user?.name && msg.author === auth.user.name 
                        ? 'bg-primary/10 dark:bg-primary/20 ml-auto items-end' 
                        : 'bg-muted/50 dark:bg-muted/20 mr-auto items-start' 
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <p className={`text-sm font-semibold mb-1 ${ 
                          !!auth.user?.name && msg.author === auth.user.name ? 'text-primary' : 'text-foreground/80' 
                        }`}>
                        {msg.author}
                        {topic && msg.author === topic.author && (
                          <span className="ml-1.5 text-xs font-normal text-green-600 dark:text-green-400">(ТС)</span>
                        )}
                      </p>
                      {/* Кнопки управления для администратора */} 
                      {auth.user?.role === 'admin' && editingMessageId !== msg.id && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5" onClick={() => handleStartEdit(msg)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                        </div>
                      )}
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