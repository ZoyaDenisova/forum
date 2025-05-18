import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData
} from '@tanstack/react-query';
import { fetchGeneralMessages, sendGeneralMessage, subscribeToGeneralChatMessages } from '@/app/api/forum';
import type { ChatMessage, MessageAuthor } from '@/types/forum';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';

interface GeneralMessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

export function GeneralChatPanel() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;

    const handleWheel = (event: WheelEvent) => {
      if (!scrollViewport) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollViewport;
      const deltaY = event.deltaY;
      const ಅscrollTop = scrollTop; // Текущая прокрутка (копия для проверки изменения)

      // Предотвращаем прокрутку родителя, если мы наверху и крутим вверх,
      // или внизу и крутим вниз
      if ((deltaY < 0 && ಅscrollTop === 0) || (deltaY > 0 && ಅscrollTop + clientHeight >= scrollHeight -1)) { // -1 для небольшого допуска
        event.preventDefault();
      }
    };

    scrollViewport?.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollViewport?.removeEventListener('wheel', handleWheel);
    };
  }, [scrollAreaRef.current]); // Перезапускаем эффект, если scrollAreaRef изменился (маловероятно, но для полноты)

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior });
          setHasNewMessages(false);
        }
      }
    }, 50);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery<
    GeneralMessagesPage,
    Error,
    InfiniteData<GeneralMessagesPage>,
    string[],
    number
  >({
    queryKey: ['generalChatMessages'],
    queryFn: ({ pageParam = 1 }) => fetchGeneralMessages(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    refetchOnWindowFocus: true,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { text: string; author: MessageAuthor }) => sendGeneralMessage(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generalChatMessages'] });
      setNewMessage('');
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: (err) => {
      toast.error(`Ошибка отправки сообщения: ${(err as Error).message}`);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
  });

  useEffect(() => {
    const unsubscribe = subscribeToGeneralChatMessages((incomingMessage) => {
      queryClient.setQueryData<InfiniteData<GeneralMessagesPage>>(
        ['generalChatMessages'],
        (oldData) => {
           if (!oldData) return {
            pages: [{ messages: [incomingMessage], hasMore: false}],
            pageParams: [1]
           };
            const newData = { ...oldData };
            const messageExists = newData.pages.some(page =>
              page.messages.some(msg => msg.id === incomingMessage.id)
            );
            if (messageExists) {
              return oldData;
            }
            if (newData.pages && newData.pages.length > 0) {
              const lastPageIndex = newData.pages.length - 1;
              const updatedMessages = [...newData.pages[lastPageIndex].messages, incomingMessage];
              const updatedLastPage = { ...newData.pages[lastPageIndex], messages: updatedMessages };
              const updatedPages = [
                ...newData.pages.slice(0, lastPageIndex),
                updatedLastPage,
              ];
              newData.pages = updatedPages;
            } else {
              newData.pages = [{ messages: [incomingMessage], hasMore: false }];
            }
            return newData;
        }
      );
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
        if (viewport) {
            const { scrollTop, scrollHeight, clientHeight } = viewport;
            if (scrollHeight - scrollTop - clientHeight > 30 && incomingMessage.author.id !== user?.id) {
                setHasNewMessages(true);
            } else {
                scrollToBottom('smooth');
            }
        }
      } else {
        scrollToBottom('smooth');
      }
    });
    return () => unsubscribe();
  }, [queryClient, user, scrollToBottom]);

  useEffect(() => {
    if (data && data.pages.length > 0 && !isFetchingNextPage) {
        const allMessages = data.pages.flatMap(page => page.messages);
        if (allMessages.length > 0) {
            const lastMessage = allMessages[allMessages.length - 1];
            if (user && (lastMessage.author.id === user.id || Date.now() - new Date(lastMessage.createdAt).getTime() < 1000)) {
                 if (scrollAreaRef.current) {
                    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
                    if (viewport) {
                        const { scrollTop, scrollHeight, clientHeight } = viewport;
                        if (scrollHeight - scrollTop - clientHeight < 250 || lastMessage.author.id === user.id) {
                            scrollToBottom('auto');
                        }
                    }
                 }
            }
        }
    }
  }, [data, isFetchingNextPage, user, scrollToBottom]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !isAuthenticated ) return;
    sendMessageMutation.mutate({
      text: newMessage.trim(),
      author: { id: user.id, name: user.name }, 
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 1) {
        setHasNewMessages(false);
    }
    if (target.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const allMessages = data?.pages.flatMap(page => page.messages) ?? [];

  return (
    <div className="flex flex-col h-full bg-card border-l">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Общий чат</h2>
      </div>
      <ScrollArea className="flex-grow h-0" ref={scrollAreaRef} onScroll={handleScroll}>
        <div className="p-4">
          {isLoading && <p className="text-center">Загрузка сообщений...</p>}
          {isError && <p className="text-center text-destructive">Ошибка: {error?.message}</p>}
          {!isLoading && !isError && allMessages.length === 0 && (
            <p className="text-center text-muted-foreground">Сообщений пока нет. Начните общение!</p>
          )}
          {allMessages.map((msg, index) => (
            <div 
              key={msg.id || `chat-msg-${index}`}
              className={`mb-3 p-2 rounded-lg max-w-[85%] ${msg.author.id === user?.id ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
              <div className="font-semibold text-sm">{msg.author.name}</div>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <div className="text-xs text-right opacity-70 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {isFetchingNextPage && <p className="text-center py-2">Загрузка старых сообщений...</p>}
        </div>
      </ScrollArea>
      {hasNewMessages && (
        <Button
            variant="outline"
            className="absolute bottom-20 right-4 z-10 shadow-lg"
            onClick={() => scrollToBottom('smooth')}
        >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Новые сообщения
        </Button>
      )}
      {isAuthenticated ? (
        <form onSubmit={handleSendMessage} className="p-3 border-t flex items-center gap-2 bg-background">
          <Input
            ref={inputRef}
            type="text"
            placeholder={"Написать сообщение..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow"
            disabled={sendMessageMutation.isPending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
            <SendHorizonal className="h-5 w-5" />
          </Button>
        </form>
      ) : (
        <div className="p-3 text-sm text-center text-muted-foreground border-t bg-background">
          <Link to="/login" className="underline">Войдите</Link> или <Link to="/register" className="underline">зарегистрируйтесь</Link>, чтобы отправлять сообщения.
        </div>
      )}
    </div>
  );
}
