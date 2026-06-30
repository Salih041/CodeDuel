'use client';

import { useRouter } from 'next/navigation';
import styles from './ErrorScreen.module.css';

export default function ErrorScreen({ type, roomId }) {
    const router = useRouter();
    
    const isFull = type === 'full';
    
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <span className={styles.icon}>{isFull ? '🔒' : '🔍'}</span>
                </div>
                <h1 className={styles.title}>
                    {isFull ? 'Room is Full' : 'Room Not Found'}
                </h1>
                <p className={styles.message}>
                    {isFull 
                        ? `The room ${roomId} already has 2 players. You cannot join.` 
                        : `The room ${roomId} does not exist or has been closed.`}
                </p>
                <button 
                    className={styles.button} 
                    onClick={() => router.push('/')}
                >
                    Back to Home Page
                </button>
            </div>
        </div>
    );
}
