import { Add24Regular } from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";

import styles from "./UploadFileButton.module.css";

interface Props {
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}

export const UploadFileButton = ({ className, onClick, disabled }: Props) => {
  const { t } = useTranslation();
  return (
    <div className={`${styles.responsiveButton} ${className ?? ""}`}>
      <Button icon={<Add24Regular />} onClick={onClick} disabled={disabled}>
        <span className={styles.buttonText}>{t("upload.manageFileUploads")}</span>
      </Button>
    </div>
  );
};
