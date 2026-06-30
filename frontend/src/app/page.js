'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer/Footer';
import styles from './page.module.css';

export default function Home() {
    const router = useRouter();
    const [joinCode, setJoinCode] = useState('');
    const [selectedLang, setSelectedLang] = useState('cpp');

    const handleCreateRoom = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'}/api/create-room`);
            const data = await res.json();
            const newRoomId = data.roomId;
            sessionStorage.setItem('creatingRoom', newRoomId);
            sessionStorage.setItem('creatingRoomLang', selectedLang);
            router.push(`/room/${newRoomId}`);
        } catch (error) {
            console.error("Failed to create room:", error);
            // Fallback in case backend is unreachable
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const newRoomId = `code-duel-${randomNum}`;
            sessionStorage.setItem('creatingRoom', newRoomId);
            sessionStorage.setItem('creatingRoomLang', selectedLang);
            router.push(`/room/${newRoomId}`);
        }
    };

    const handleJoinRoom = (e) => {
        if (e) e.preventDefault();
        if (!joinCode.trim()) return;
        let code = joinCode.trim().toLowerCase();
        // Automatically add prefix if the user entered only 4 digits
        if (/^\d{4}$/.test(code)) {
            code = `code-duel-${code}`;
        }
        router.push(`/room/${code}`);
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.card}>
                <h1 className={styles.title}>
                    Welcome to CodeDuel
                </h1>
                <p className={styles.subtitle}>
                    Compete with your friends in real-time coding duels.
                </p>

                {/* Create Room */}
                <div className={styles.createSection}>
                    <div className={styles.langSelectWrapper}>
                        <select
                            className={styles.langSelect}
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            title="Select Language"
                        >
                            <option value="cpp">C++</option>
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="csharp">C#</option>
                        </select>
                    </div>
                    <button
                        onClick={handleCreateRoom}
                        className={styles.primaryButton}
                    >
                        Create Private Room
                    </button>
                </div>

                <p className={styles.hintText}>
                    A random room code will be generated. Share it with your friend to start!
                </p>

                <div className={styles.divider}>
                    <div className={styles.dividerLine}></div>
                    <span className={styles.dividerText}>OR</span>
                    <div className={styles.dividerLine}></div>
                </div>

                {/* Join Room */}
                <div className={styles.joinSection}>
                    <input
                        type="text"
                        placeholder="Enter Room Code (e.g. code-duel-1234 or 1234)"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className={styles.inputField}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleJoinRoom();
                        }}
                    />
                    <button
                        onClick={handleJoinRoom}
                        className={styles.secondaryButton}
                    >
                        Join Room
                    </button>
                </div>
            </div>
        </div>
        <Footer />
        </>
    );
}
