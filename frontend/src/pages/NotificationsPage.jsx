import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, CheckCheck, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import Badge from '../components/Badge';

export default function NotificationsPage({ navigate }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div style={{ maxWidth: 760, margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>In-App Notifications</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Updates on your task acceptances, evaluation decisions, credit awards, and project milestones.
          </p>
        </div>

        {unreadCount > 0 && (
          <button className="btn btn-sm btn-secondary" onClick={markAllAsRead} style={{ gap: '0.4rem' }}>
            <CheckCheck size={16} /> Mark All as Read
          </button>
        )}
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell className="empty-icon" />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No Notifications Yet</div>
            <p style={{ fontSize: '0.875rem' }}>You're all caught up. Notifications appear when tasks are accepted, evaluated, or credited.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map(n => {
              const isUnread = n.is_read === 0;

              return (
                <div
                  key={n.id}
                  style={{
                    border: isUnread ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border)',
                    background: isUnread ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{n.title}</span>
                      {isUnread && (
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>New</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                      {n.message}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                    {n.link_url && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          markAsRead(n.id);
                          navigate(n.link_url);
                        }}
                        style={{ gap: '0.35rem' }}
                      >
                        <span>View</span>
                        <ExternalLink size={13} />
                      </button>
                    )}

                    {isUnread && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => markAsRead(n.id)}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
