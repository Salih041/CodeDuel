'use client';

import { useState, useEffect } from 'react';
import styles from './Timer.module.css';

const Timer = ({ durationMs, startTime, gameState }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        
        return () => clearInterval(interval);
    }, [gameState]);

    let timeLeft = durationMs;
    if (gameState === 'playing' || gameState === 'finished') {
        const parsedStartTime = new Date(startTime).getTime();
        const elapsed = Math.max(0, now - parsedStartTime);
        timeLeft = Math.max(0, durationMs - elapsed);
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    return (
        <div className={`${styles.timerContainer} ${timeLeft <= 60000 ? styles.timerWarning : ''}`}>
            <span className={styles.timerIcon}>⏱️</span>
            <span className={styles.timerText}>
                Time Left: {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
};

export default Timer;
