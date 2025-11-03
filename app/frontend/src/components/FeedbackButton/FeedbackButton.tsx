import { PersonFeedback24Regular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import styles from "./FeedbackButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
}

export const FeedbackButton = ({ className, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <div className={`${styles.responsiveButton} ${className || ""}`}>
            <Button icon={<PersonFeedback24Regular />} onClick={onClick}>
                <span className={styles.buttonText}>{t("Feedback")}</span>
            </Button>
        </div>
    );
};