import React from "react";
import styles from "./Help.module.css";
import { useTranslation } from "react-i18next";
import { Dialog, DialogFooter, DefaultButton, DialogType } from "@fluentui/react";

import chatHistoryImage from "./chat-history.png";
import fileUploadImage from "./file-upload.png";
import developerSettingsImage from "./settings.png";
import clearChatImage from "./clear-chat.png";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpContent = ({ isOpen, onClose }: Props) => {
    const { t } = useTranslation();

    return (
        <Dialog
            hidden={!isOpen}
            onDismiss={onClose}
            dialogContentProps={{
                type: DialogType.close,
                closeButtonAriaLabel: t("Lukk")
            }}
            modalProps={{
                isBlocking: false,
                containerClassName: styles.helpDialogContainer
            }}
        >
            <div className={styles.helpDialogContent}>
                <h1>Brukerveiledning</h1>
                <p>
                    Møteroms appen er laget for å hjelpe deg med problemer som måtte oppstå i møterommene.
                </p>
            </div>
            <DialogFooter>
                <DefaultButton onClick={onClose} text={t("Lukk")} className={styles.closeButton} />
            </DialogFooter>
        </Dialog>
    );
};
