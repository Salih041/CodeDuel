'use client';
import styles from './Footer.module.css';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const version = "v1.0.0";
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContent}>

                <div className={styles.footerLeft}>
                    <p>&copy; {currentYear} CodeDuel</p>
                    <span className={styles.footerVersion}>{version}</span>
                </div>

                <div className={styles.footerRight}>
                    <span className={styles.footerDeveloper}>Developed by <strong>Salih</strong></span>

                    <div className={styles.footerSocials}>
                        <a href="https://www.github.com/Salih041" target="_blank" rel="noopener noreferrer" title="GitHub">
                            <FaGithub />
                        </a>
                        <a href="https://www.linkedin.com/in/salihozbk41" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                            <FaLinkedin />
                        </a>
                    </div>
                </div>

            </div>
        </footer>
    )
}
