import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      // Max 3 visible
      return next.length > 3 ? next.slice(-3) : next;
    });
    if (duration > 0) {
      timers.current[id] = setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toast = useCallback({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur || 6000),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }, [addToast]);

  // Workaround: useCallback can't return an object directly, use useMemo pattern
  const toastFns = useRef({ success: null, error: null, info: null });
  toastFns.current.success = (msg, dur) => addToast(msg, 'success', dur);
  toastFns.current.error = (msg, dur) => addToast(msg, 'error', dur || 6000);
  toastFns.current.info = (msg, dur) => addToast(msg, 'info', dur);

  return (
    <ToastContext.Provider value={toastFns.current}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// --- Toast Container & Toast Component ---

const COLORS = {
  success: { bg: '#0a2e1a', border: '#4ecca3', icon: '✓', accent: '#4ecca3' },
  error: { bg: '#2e0a0a', border: '#e74c3c', icon: '✕', accent: '#e74c3c' },
  info: { bg: '#0a1a2e', border: '#3498db', icon: 'ℹ', accent: '#3498db' },
};

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      maxWidth: '380px',
      width: 'calc(100vw - 2rem)',
    }}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const c = COLORS[toast.type] || COLORS.info;

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      animation: 'toastSlideIn 0.25s ease-out',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: c.accent,
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '0.75rem',
        flexShrink: 0,
        marginTop: '1px',
      }}>
        {c.icon}
      </span>
      <span style={{
        flex: 1,
        color: '#e0e0e0',
        fontSize: '0.9rem',
        lineHeight: '1.4',
        wordBreak: 'break-word',
      }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          padding: '0',
          fontSize: '1.1rem',
          lineHeight: '1',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
