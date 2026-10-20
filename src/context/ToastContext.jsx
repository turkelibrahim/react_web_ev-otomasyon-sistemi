import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckIcon, AlertCircleIcon, InfoIcon, XIcon } from '../components/Icons';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', title = '') => {
    // Aynı mesaj arka arkaya eklenmişse tekrar ekleme (De-duplication)
    setToasts((prev) => {
      const alreadyExists = prev.some((t) => t.message === message && t.type === type);
      if (alreadyExists) return prev;

      const id = Date.now() + Math.random().toString(36).substring(2, 7);
      const newToast = { id, message, type, title };

      // Maksimum 4 adet bildirim göster (ekranı kaplamasın)
      const updated = [...prev.slice(-3), newToast];

      setTimeout(() => {
        removeToast(id);
      }, 4000);

      return updated;
    });
  }, [removeToast]);

  // Kararlı (stable) toast nesnesi - sonsuz render döngüsünü tamamen engeller
  const toast = useMemo(() => ({
    success: (msg, title = 'Başarılı') => addToast(msg, 'success', title),
    error: (msg, title = 'Hata') => addToast(msg, 'error', title),
    warning: (msg, title = 'Uyarı') => addToast(msg, 'warning', title),
    info: (msg, title = 'Bilgilendirme') => addToast(msg, 'info', title),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      {/* Toast Render Alanı */}
      <div className="toast-container" id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-card toast-${t.type}`} role="alert">
            <div className="toast-icon-wrapper">
              {t.type === 'success' && <CheckIcon size={20} />}
              {t.type === 'error' && <AlertCircleIcon size={20} />}
              {t.type === 'warning' && <AlertCircleIcon size={20} />}
              {t.type === 'info' && <InfoIcon size={20} />}
            </div>
            <div className="toast-content">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message">{t.message}</div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
              aria-label="Kapat"
            >
              <XIcon size={16} />
            </button>
            <div className="toast-progress" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast, ToastProvider içinde kullanılmalıdır.');
  }
  return context;
}
