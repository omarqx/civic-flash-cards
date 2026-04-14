/**
 * <civic-toast> — Global toast notification container
 */
import type { ToastType } from '../../types';

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

export class CivicToast extends HTMLElement {
  connectedCallback() {
    this.id = 'toast-container';
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-atomic', 'true');
  }

  show(message: string, type: ToastType = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="material-icons-round">${ICONS[type] || ICONS.info}</span>
      <span>${message}</span>
    `;
    this.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }
}

customElements.define('civic-toast', CivicToast);

// Global accessor
let toastInstance: CivicToast | null = null;

export function getToast(): CivicToast {
  if (!toastInstance) {
    toastInstance = document.querySelector<CivicToast>('civic-toast');
    if (!toastInstance) {
      toastInstance = document.createElement('civic-toast') as CivicToast;
      document.body.appendChild(toastInstance);
    }
  }
  return toastInstance;
}

export function showToast(message: string, type: ToastType = 'info') {
  getToast().show(message, type);
}
