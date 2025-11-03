import { Info24Regular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import styles from "./HelpButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
}

export const HelpButton = ({ className, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <div className={`${styles.responsiveButton} ${className || ""}`}>
            <Button icon={<Info24Regular />} onClick={onClick}>
                <span className={styles.buttonText}>{t("Help")}</span>
            </Button>
        </div>
    );
};