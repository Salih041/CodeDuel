'use client';
import styles from './Modal.module.css';

export default function Modal({ isOpen, type, title, message, onClose, testResults }) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className={styles.icon}>
                    {type === 'success' && '🏆'}
                    {type === 'error' && '💥'}
                    {type === 'warning' && '⚠️'}
                    {type === 'info' && 'ℹ️'}
                </div>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>
                
                {testResults && testResults.length > 0 && (
                    <div className={styles.testResults}>
                        {testResults.map((tr, i) => (
                            <div key={i} className={`${styles.testCase} ${tr.status === 'PASS' ? styles.pass : styles.fail}`}>
                                <strong>Test {tr.testNum}:</strong> {tr.status}
                                {tr.detail && <div className={styles.testDetail}>{tr.detail}</div>}
                            </div>
                        ))}
                    </div>
                )}

                <button className={styles.button} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}
