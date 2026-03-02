import { NoticeTone } from '../types';

export interface ToastItem {
  id: string;
  tone: NoticeTone;
  message: string;
}

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ items, onDismiss }: ToastStackProps) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {items.map((toast) => (
        <article key={toast.id} className={`toast ${toast.tone}`}>
          <p>{toast.message}</p>
          <button className="ghost small" onClick={() => onDismiss(toast.id)}>Dismiss</button>
        </article>
      ))}
    </div>
  );
}
