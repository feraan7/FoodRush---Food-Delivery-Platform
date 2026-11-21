import { Bell, CheckCheck, ExternalLink, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { io } from 'socket.io-client';
import { api, NotificationItem } from '../lib/api';
import { useAuth } from '../stores/auth';

export function NotificationBell() {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    if (!user) return;
    try {
      const res = await api<{ items: NotificationItem[]; unreadCount: number }>('/notifications');
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    if (!token) return;
    const socket = io({ auth: { token } });
    socket.on('notification:new', (notif: NotificationItem) => {
      setItems((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, {}, { method: 'PATCH' });
      setItems((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', {}, { method: 'PATCH' });
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-muted hover:bg-surface hover:text-ink transition"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-zinc-100 p-4 z-50">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-orange-100 text-brand-700 px-2 py-0.5 text-[11px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5 divide-y divide-zinc-50">
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">No notifications yet</div>
            ) : (
              items.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markRead(n._id)}
                  className={`pt-2.5 first:pt-0 cursor-pointer transition ${!n.isRead ? 'bg-orange-50/40 p-2 rounded-xl' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs text-ink leading-snug">{n.title}</h4>
                    <span className="text-[10px] text-muted whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{n.message}</p>
                  {n.link && (
                    <Link
                      to={n.link}
                      onClick={() => setOpen(false)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
                    >
                      View details <ExternalLink className="size-3" />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
