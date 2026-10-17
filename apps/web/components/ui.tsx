'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ badge */

export function Badge({
  tone = 'gray',
  children,
}: {
  tone?: string;
  children: ReactNode;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/* -------------------------------------------------------------------- kpi */

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'accent' | 'gold';
}) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${tone ?? ''}`}>{value}</div>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h3 className="h2">{title}</h3>
            {subtitle ? <div className="text-xs muted">{subtitle}</div> : null}
          </div>
          <button type="button" className="btn ghost small" onClick={onClose}>
            إغلاق
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ toast */

interface ToastItem {
  id: number;
  message: string;
  error: boolean;
}

interface ToastContextValue {
  notify: (message: string, error?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, error = false) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, error }]);
    setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3400);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.error ? 'error' : ''}`}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

/* ------------------------------------------------------------------ misc */

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Loading({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return <div className="empty">{label}</div>;
}

export function Progress({ percent }: { percent: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle ? <p className="text-sm muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="topbar-actions">{actions}</div> : null}
    </div>
  );
}
