'use client';


import styles from './Navbar.module.css';

export default function Navbar() {
    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className={styles.logo}>
                    CodeDuel<span className={styles.dot}>.</span>
                </a>
            </div>
        </nav>
    );
}
