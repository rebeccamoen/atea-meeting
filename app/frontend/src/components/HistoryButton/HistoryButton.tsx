import { History24Regular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";

import styles from "./HistoryButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const HistoryButton = ({ className, disabled, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <div className={`${styles.responsiveButton} ${className ?? ""}`}>
            <Button icon={<History24Regular />} disabled={disabled} onClick={onClick}>
                <span className={styles.buttonText}>{t("history.openChatHistory")}</span>
            </Button>
        </div>
    );
};
