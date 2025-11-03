import React, { useState, useEffect, useRef, RefObject, createContext, useContext } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Layout.module.css";

import { useLogin } from "../../authConfig";

import { LoginButton } from "../../components/LoginButton";
import { IconButton } from "@fluentui/react";

import { HelpContent } from "../../components/HelpContent";
import { FeedbackForm } from "../../components/FeedbackForm";

// add "export" in front of the types
export type HeaderAction = {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export type HeaderMenuContextType = {
  actions: HeaderAction[];
  setActions: React.Dispatch<React.SetStateAction<HeaderAction[]>>;
};

const HeaderMenuContext = createContext<HeaderMenuContextType | null>(null);
export const useHeaderMenu = () => {
    const ctx = useContext(HeaderMenuContext);
    if (!ctx) throw new Error("useHeaderMenu must be used within HeaderMenuProvider");
    return ctx;
};

const Layout = () => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [actions, setActions] = useState<HeaderAction[]>([]);

    const menuRef: RefObject<HTMLDivElement> = useRef(null);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setMenuOpen(false);
        }
    };

    useEffect(() => {
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <HeaderMenuContext.Provider value={{ actions, setActions }}>
            <div className={styles.layout}>
                <div className={styles.pageFrame}>
                <header className={styles.header} role={"banner"}>
                    <div className={styles.headerContainer} ref={menuRef}>
                        <nav>
                            <ul className={`${styles.headerNavList} ${styles.onlyMobile} ${menuOpen ? styles.show : ""}`}>
                                {actions.map(a => (
                                    <li key={a.key}>
                                        <button
                                            className={styles.headerNavAction}
                                            onClick={() => {
                                                setMenuOpen(false);
                                                a.onClick();
                                            }}
                                            disabled={a.disabled}
                                        >
                                            {a.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </header>

            <main className={styles.main} id="main-content">
                    <Outlet />
            </main>
            </div>

                {isHelpOpen && <HelpContent isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />}
                {isFeedbackOpen && <FeedbackForm isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />}
            </div>
        </HeaderMenuContext.Provider>
    );
};

export default Layout;
