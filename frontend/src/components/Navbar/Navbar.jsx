'use client';


import styles from './Navbar.module.css';
import Image from 'next/image';

export default function Navbar() {
    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className={styles.logo}>
                    <Image src="/favicon.svg" alt="CodeDuel Logo" className={styles.logoIcon} width={72} height={72} />
                    CodeDuel<span className={styles.dot}>.</span>
                </a>
            </div>
        </nav>
    );
}
