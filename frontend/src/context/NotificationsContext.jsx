import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const refresh = useCallback(() => {
    if (!user) return;
    api.get('/notifications/unread-count').then((res) => setUnreadCount(res.data.count)).catch(() => {});
    api.get('/users/me/follow-requests').then((res) => setRequestCount(res.data.requests.length)).catch(() => {});
    api.get('/messages/unread-count').then((res) => setMessageCount(res.data.count)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setRequestCount(0);
      setMessageCount(0);
      return;
    }
    refresh();
    const interval = setInterval(refresh, 15000);
    const handleRealtimeChange = () => refresh();
    window.addEventListener('emberly:messages-changed', handleRealtimeChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('emberly:messages-changed', handleRealtimeChange);
    };
  }, [user, refresh]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    api.post('/notifications/read-all').catch(() => {});
  }, []);

  return (
    <NotificationsContext.Provider value={{ unreadCount, requestCount, messageCount, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
