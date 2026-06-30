'use client';
import styles from './Toast.module.css';

export default function ToastContainer({ toasts }) {
    if (!toasts || toasts.length === 0) return null;

    return (
        <div className={styles.toastContainer}>
            {toasts.map(toast => (
                <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                    <span className={styles.icon}>
                        {toast.type === 'success' && '✅'}
                        {toast.type === 'error' && '❌'}
                        {toast.type === 'info' && '💡'}
                    </span>
                    <span className={styles.message}>{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
