'use client'

import dynamic from 'next/dynamic';
import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Timer from '@/components/Timer/Timer';
import ErrorScreen from '@/components/ErrorScreen/ErrorScreen';
import ToastContainer from '@/components/Toast/Toast';
import CodeEditor from '@/components/CodeEditor/CodeEditor';
import Modal from '@/components/Modal/Modal';
import styles from './Room.module.css';


export default function RoomPage({ params }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const roomId = resolvedParams.id;

    const [gameState, setGameState] = useState('waiting');
    const socketRef = useRef(null);

    const [opponentCode, setOpponentCode] = useState('');
    const timeoutRef = useRef(null);

    const [problem, setProblem] = useState({ title: '', description: '', starterCodes: {} });
    const [userCode, setUserCode] = useState('// Write your solution here...');

    // Yeni State'ler
    const [selectedLanguage, setSelectedLanguage] = useState('cpp');
    const [timerInfo, setTimerInfo] = useState(null);
    const [playAgainSent, setPlayAgainSent] = useState(false);

    // Custom Modal & Toasts
    const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
    const [toasts, setToasts] = useState([]);
    const [countdownValue, setCountdownValue] = useState(null);
    const [floatingReactions, setFloatingReactions] = useState([]);
    const [bouncingEmoji, setBouncingEmoji] = useState(null);
    const [myFloatingReactions, setMyFloatingReactions] = useState([]);

    const handleSubmitRef = useRef();

    const openModal = (type, title, message, testResults = null) => {
        setModal({ isOpen: true, type, title, message, testResults });
    };

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
    };

    const addToast = (type, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const isCreatorRef = useRef(false);
    const creatorLangRef = useRef('cpp');
    const selectedLanguageRef = useRef(selectedLanguage);

    useEffect(() => {
        selectedLanguageRef.current = selectedLanguage;
    }, [selectedLanguage]);

    useEffect(() => {
        const storedRoom = sessionStorage.getItem('creatingRoom');
        const storedLang = sessionStorage.getItem('creatingRoomLang');
        if (storedRoom === roomId) {
            isCreatorRef.current = true;
            if (storedLang) {
                creatorLangRef.current = storedLang;
            }
            sessionStorage.removeItem('creatingRoom');
            sessionStorage.removeItem('creatingRoomLang');
        }

        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL);
        const socket = socketRef.current;

        const currentAction = isCreatorRef.current ? 'create' : 'join';
        const emitLang = isCreatorRef.current ? creatorLangRef.current : 'cpp';
        socket.emit('join-room', { roomId, action: currentAction, language: emitLang });

        socket.on('room-joined', (data) => {
            if (data.language) {
                setSelectedLanguage(data.language);
            }
        });

        socket.on('room-not-found', (data) => {
            setGameState('not-found');
            addToast('error', data.message);
        });

        socket.on('start-game', (data) => {
            setGameState('playing');
            setProblem(data.problem);
            setPlayAgainSent(false);
            // Sunucudan gelen dilin starter kodunu yükle
            setUserCode(data.problem.starterCodes[data.language] || '');
            setOpponentCode('');
            setTimerInfo({ startTime: data.startTime, durationMs: data.durationMs });
            closeModal();
            addToast('info', data.message);
        })

        socket.on('game-result', (data) => {
            setPlayAgainSent(false);
            if (data.status === 'winner' || data.status === 'loser') {
                setGameState('finished');
                const isWinner = data.status === 'winner';
                openModal(
                    isWinner ? 'success' : 'error',
                    isWinner ? 'Congratulations!' : 'Game Over',
                    data.message,
                    data.testResults
                );
            } else if (data.status === 'error') {
                openModal('warning', 'Tests Failed', data.message, data.testResults);
            } else {
                addToast('info', data.message);
            }
        })

        socket.on('room-full', (data) => {
            setGameState('full');
            addToast('error', data.message);
        })

        socket.on('opponent-disconnected', () => {
            addToast('warning', 'The opponent has disconnected. They are expected to return to the game...');
        })

        socket.on('opponent-reconnected', () => {
            addToast('info', 'The opponent has reconnected!');
        })

        socket.on('receive-reaction', (data) => {
            const id = Date.now() + Math.random();
            setFloatingReactions(prev => [...prev, { id, emoji: data.emoji }]);
            setTimeout(() => {
                setFloatingReactions(prev => prev.filter(r => r.id !== id));
            }, 2000);
        });

        socket.on('game-countdown', (data) => {
            setGameState('countdown');
            setProblem(data.problem);
            if (data.language) setSelectedLanguage(data.language);
            setUserCode(data.problem.starterCodes[data.language] || '');
            setOpponentCode('');
            closeModal();
            addToast('info', data.message);
        });

        socket.on('countdown-tick', (data) => {
            setCountdownValue(data.count);
        });

        socket.on('code-update', (data) => {
            // Obfuscate the code: replace non-whitespace characters with block char
            const obfuscated = data.code.replace(/[^\s\n]/g, '█');
            setOpponentCode(obfuscated);
        });

        socket.on('opponent-wants-rematch', () => {
            addToast('info', 'Your opponent wants a rematch!');
        });

        return () => {
            socket.disconnect();
        };

    }, [roomId]);

    // Sayfadan ayrılmayı önleme
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (gameState === 'playing' || gameState === 'countdown') {
                e.preventDefault();
                e.returnValue = ''; // Tarayıcı standart uyarısını gösterir
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gameState]);

    const handleEditorChange = (value) => {
        setUserCode(value);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (socketRef.current && gameState === 'playing') {
                socketRef.current.emit('code-update', { roomId, code: value });
            }
        }, 200)
    }

    const handleSubmit = () => {
        if (socketRef.current && gameState === 'playing') {
            socketRef.current.emit('submit-code', { roomId, code: userCode });
        }
    }

    const sendReaction = (emoji) => {
        if (socketRef.current) {
            socketRef.current.emit('send-reaction', { roomId, emoji });
            setBouncingEmoji(emoji);
            setTimeout(() => setBouncingEmoji(null), 300);

            const id = Date.now() + Math.random();
            setMyFloatingReactions(prev => [...prev, { id, emoji }]);
            setTimeout(() => {
                setMyFloatingReactions(prev => prev.filter(r => r.id !== id));
            }, 2000);
        }
    }

    // Reference güncellemesi (Ctrl+Enter kısayolu için her zaman en güncel state ile çalışsın)
    useEffect(() => {
        handleSubmitRef.current = handleSubmit;
    });

    const handleEditorDidMount = (editor, monaco) => {
        // Ctrl+Enter veya Cmd+Enter kısayolu
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (handleSubmitRef.current) handleSubmitRef.current();
        });
    }

    const handlePlayAgain = () => {
        if (socketRef.current && gameState === 'finished' && !playAgainSent) {
            setPlayAgainSent(true);
            socketRef.current.emit('play-again', { roomId });
            addToast('info', 'Rematch request sent...');
        }
    }

    if (gameState === 'full' || gameState === 'not-found') {
        return <ErrorScreen type={gameState} roomId={roomId} />;
    }

    return (
        <div className={styles.appContainer}>
            {/* Header */}
            <header className={styles.topHeader}>
                <h1 className={styles.roomTitle}>Room: {roomId}</h1>

                {timerInfo && (
                    <Timer durationMs={timerInfo.durationMs} startTime={timerInfo.startTime} gameState={gameState} />
                )}

                <div className={`${styles.statusBadge} ${gameState === 'waiting' ? styles.statusWaiting : gameState === 'playing' ? styles.statusPlaying : styles.statusFinished}`}>
                    {gameState === 'waiting' && <>⏳ Waiting for Opponent</>}
                    {gameState === 'playing' && <>🔥 Duel Started</>}
                    {gameState === 'finished' && <>🏁 Match Finished</>}
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.mainContent}>

                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>Task</div>
                    <div className={styles.sidebarContent}>
                        {problem.title ? (
                            <>
                                <h2 className={styles.problemTitle}>{problem.title}</h2>
                                <p className={styles.problemDesc}>{problem.description}</p>

                                {gameState === 'playing' && (
                                    <button className={styles.btnPrimary} onClick={handleSubmit}>
                                        Submit Solution (Ctrl+Enter)
                                    </button>
                                )}

                                {gameState === 'finished' && (
                                    <button
                                        className={styles.btnPrimary}
                                        onClick={handlePlayAgain}
                                        disabled={playAgainSent}
                                    >
                                        {playAgainSent ? 'Waiting...' : 'Play Again'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>Loading problem...</p>
                        )}
                    </div>
                </div>

                {/* Editor Area */}
                <div className={styles.editorsWrapper}>

                    {/* You */}
                    <div className={styles.editorPane}>
                        <div className={styles.editorHeader}>
                            <div className={`${styles.editorTitle} ${styles.you}`}>Your Code</div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Lang: {selectedLanguage.toUpperCase()}
                            </span>
                        </div>
                        <div className={styles.editorContainer}>
                            <CodeEditor
                                language={selectedLanguage}
                                value={userCode}
                                onChange={handleEditorChange}
                                onSubmit={() => handleSubmitRef.current?.()}
                            />
                            {myFloatingReactions.map(reaction => (
                                <div key={reaction.id} className={styles.floatingReaction}>
                                    {reaction.emoji}
                                </div>
                            ))}
                        </div>
                        <div className={styles.reactionsBar}>
                            {['🔥', '💀', '🚀', '😭', '👀'].map(emoji => (
                                <button
                                    key={emoji}
                                    className={`${styles.reactionBtn} ${bouncingEmoji === emoji ? styles.bounce : ''}`}
                                    onClick={() => sendReaction(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Opponent */}
                    <div className={styles.editorPane}>
                        <div className={styles.editorHeader}>
                            <div className={styles.editorTitle}>Opponent&apos;s Code</div>
                            {gameState !== 'waiting' && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Lang: {selectedLanguage.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className={styles.editorContainer}>
                            {gameState === 'playing' || gameState === 'finished' || gameState === 'countdown' ? (
                                <CodeEditor
                                    language={selectedLanguage}
                                    value={opponentCode}
                                    readOnly={true}
                                />
                            ) : (
                                <div className={styles.placeholderOverlay}>
                                    <span className={styles.pulseAnim} style={{ fontSize: '2rem' }}>👀</span>
                                    <span>Rakip Bekleniyor...</span>
                                </div>
                            )}

                            {floatingReactions.map(reaction => (
                                <div key={reaction.id} className={styles.floatingReaction}>
                                    {reaction.emoji}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>

            {gameState === 'countdown' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', backdropFilter: 'blur(5px)'
                }}>
                    <h1 style={{ fontSize: '12rem', color: 'var(--accent-color)', textShadow: '0 0 40px var(--shadow-color)', margin: 0, lineHeight: 1 }}>
                        {countdownValue}
                    </h1>
                    <p style={{ color: 'var(--text-primary)', fontSize: '2rem', marginTop: '1rem', fontWeight: 600 }}>Get Ready!</p>
                </div>
            )}

            <Modal
                isOpen={modal.isOpen}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                testResults={modal.testResults}
                onClose={() => setModal({ ...modal, isOpen: false })}
            />

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} />
        </div>
    );
}