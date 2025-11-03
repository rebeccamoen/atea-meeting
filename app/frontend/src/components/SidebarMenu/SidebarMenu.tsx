import { memo, useEffect, useMemo, useState, useCallback } from "react";
import styles from "./SidebarMenu.module.css";
import type { SidebarMenuProps, SidebarMode } from "./SidebarMenu.types";
import { AppIcon } from "../../ui/AppIcon";
import { AppIconButton } from "../../ui/AppIconButton";
import { useTranslation } from "react-i18next";

const LS_KEY = "sidebar.pushOpenPref";

const OVERLAY_MAX = 800;

export const SidebarMenu = memo(function SidebarMenu(props: SidebarMenuProps) {
    const {
        items,
        footerExpanded,
        footerCollapsed,
        historyList,
        logo,

        open: controlledOpen,
        onOpenChange,
        mode: controlledMode,

        responsive = true,
        breakpointPx = OVERLAY_MAX,
        defaultOpen = true,

        hideInlineHamburger = false
    } = props;

    const { t } = useTranslation();

    const detectMode = useCallback((): SidebarMode => {
        if (!responsive) return "push";
        if (typeof window === "undefined") return "push";
        return window.innerWidth <= breakpointPx ? "overlay" : "push";
    }, [responsive, breakpointPx]);

    const [mode, setMode] = useState<SidebarMode>(() => controlledMode ?? detectMode());

    const [pushOpenPref, setPushOpenPref] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const raw = window.localStorage.getItem(LS_KEY);
            if (raw === "true" || raw === "false") return raw === "true";
        }
        return defaultOpen;
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(LS_KEY, String(pushOpenPref));
            } catch {}
        }
    }, [pushOpenPref]);

    useEffect(() => {
        if (controlledMode) setMode(controlledMode);
    }, [controlledMode]);

    const [internalOpen, setInternalOpen] = useState<boolean>(() => {
        const initialMode = controlledMode ?? detectMode();
        return initialMode === "overlay" ? false : pushOpenPref;
    });

    const open = controlledOpen ?? internalOpen;

    const setOpen = useCallback(
        (next: boolean) => {
            if (onOpenChange) {
                onOpenChange(next);
            } else {
                setInternalOpen(next);
                if (controlledOpen === undefined && (controlledMode ?? mode) === "push") {
                    setPushOpenPref(next);
                }
            }
        },
        [onOpenChange, controlledOpen, controlledMode, mode]
    );

    const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

    useEffect(() => {
        if (controlledMode) return;

        const onResize = () => {
            const nextMode = detectMode();
            setMode(prev => {
                if (prev === nextMode) return prev;

                if (nextMode === "overlay") {
                    if (controlledOpen === undefined) setInternalOpen(false);
                } else {
                    if (controlledOpen === undefined) setInternalOpen(pushOpenPref);
                }
                return nextMode;
            });
        };

        onResize();
        if (typeof window !== "undefined") {
            window.addEventListener("resize", onResize);
            return () => window.removeEventListener("resize", onResize);
        }
    }, [detectMode, controlledOpen, controlledMode, pushOpenPref]);

    useEffect(() => {
        const root = document.documentElement;
        const offset = mode === "push" && open ? "var(--sidebar-width)" : mode === "overlay" ? "0px" : "var(--rail-width)";
        root.style.setProperty("--sidebar-offset", offset);
        return () => {
            root.style.setProperty("--sidebar-offset", "var(--rail-width)");
        };
    }, [mode, open]);

    useEffect(() => {
        if (controlledMode) return;
        if ((controlledMode ?? mode) === "push" && controlledOpen === undefined) {
            setInternalOpen(pushOpenPref);
        }
    }, [mode, controlledMode, controlledOpen, pushOpenPref]);

    useEffect(() => {
        if (controlledOpen === undefined) return;
        if ((controlledMode ?? mode) === "push") {
            setPushOpenPref(controlledOpen);
        }
    }, [controlledOpen, mode, controlledMode]);

    const visibleItems = useMemo(() => items.filter(it => it.show !== false), [items]);

    const isExpanded = open && (mode === "push" || mode === "overlay");

    const showInlineHamburger = !isExpanded && (mode === "push" || (mode === "overlay" && !hideInlineHamburger));

    const showFloatingHamburger = mode === "overlay" && !open;

    return (
        <div className={styles.host} data-mode={mode} data-open={open}>
            {showFloatingHamburger && <AppIconButton className={styles.globalToggle} icon="menu" size="sm" variant="muted" onClick={() => setOpen(true)} />}
            <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden />
            <aside className={styles.aside} role="complementary" aria-expanded={open}>
                <div className={styles.header}>
                    {isExpanded ? (
                        <>
                            <AppIconButton
                                icon="home"
                                size="lg"
                                onClick={() => (window.location.href = "/")}
                                slot="sidebar"
                            />
                            <AppIconButton
                                icon="panelLeft"
                                size="lg"
                                variant="muted"
                                title={t("sidebar.hide")}
                                aria-label={t("sidebar.hide")}
                                onClick={toggle}
                                slot="sidebar"
                            />
                        </>
                    ) : showInlineHamburger ? (
                        <AppIconButton
                            icon="panelLeft"
                            size="lg"
                            title={t("sidebar.show")}
                            aria-label={t("sidebar.show")}
                            onClick={toggle}
                            slot="sidebar"
                        />
                    ) : null}
                </div>

                {isExpanded ? (
                    <div className={styles.body}>
                        <div className={styles.menu}>
                            <div className={styles.list}>
                                {visibleItems.map(item => (
                                    <button key={item.key} className={styles.item} onClick={item.onClick} disabled={item.disabled}>
                                        <AppIcon name={item.icon} aria-hidden />
                                        <span className={styles.itemLabel}>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.railScroll}>
                        {visibleItems.map(item => (
                            <div key={item.key} className={styles.railIconRow}>
                                <AppIconButton
                                    icon={item.icon}
                                    title={item.label}
                                    slot="sidebar"
                                    aria-label={item.label}
                                    onClick={item.onClick}
                                    disabled={item.disabled}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.sidebarFooter}>{isExpanded ? footerExpanded : footerCollapsed}</div>
            </aside>
        </div>
    );
});
