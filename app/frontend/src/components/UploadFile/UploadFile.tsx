import React, { useState, useEffect, ChangeEvent } from "react";
import { Callout, Label, Text, Panel, DefaultButton } from "@fluentui/react";
import { Button } from "@fluentui/react-components";
import { Add24Regular, Delete24Regular } from "@fluentui/react-icons";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";

import { SimpleAPIResponse, uploadFileApi, deleteUploadedFileApi, listUploadedFilesApi } from "../../api";
import { useLogin, getToken } from "../../authConfig";
import styles from "./UploadFile.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    asPanel?: boolean;
    isOpen?: boolean; // only used if asPanel = true
    onDismiss?: () => void; // only used if asPanel = true
}

export const UploadFile: React.FC<Props> = ({ className, disabled, asPanel, isOpen, onDismiss }) => {
    const [isCalloutVisible, setIsCalloutVisible] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [deletionStatus, setDeletionStatus] = useState<{ [filename: string]: "pending" | "error" | "success" }>({});
    const [uploadedFile, setUploadedFile] = useState<SimpleAPIResponse>();
    const [uploadedFileError, setUploadedFileError] = useState<string>();
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const { t } = useTranslation();

    if (!useLogin) {
        throw new Error("The UploadFile component requires useLogin to be true");
    }

    const client = useMsal().instance;

    // 🔹 Shared function: load file list
    const listUploadedFiles = async (idToken: string) => {
        listUploadedFilesApi(idToken).then(files => {
            setIsLoading(false);
            setDeletionStatus({});
            setUploadedFiles(files);
        });
    };

    // 🔹 Fetch when panel opens
    useEffect(() => {
        if (asPanel && isOpen) {
            const fetchFiles = async () => {
                try {
                    const idToken = await getToken(client);
                    if (!idToken) throw new Error("No authentication token available");
                    await listUploadedFiles(idToken);
                } catch (err) {
                    console.error(err);
                    setIsLoading(false);
                }
            };
            fetchFiles();
        }
    }, [asPanel, isOpen]);

    // 🔹 Callout button click
    const handleButtonClick = async () => {
        setIsCalloutVisible(!isCalloutVisible);
        try {
            const idToken = await getToken(client);
            if (!idToken) throw new Error("No authentication token available");
            await listUploadedFiles(idToken);
        } catch (err) {
            console.error(err);
            setIsLoading(false);
        }
    };

    // 🔹 Remove file
    const handleRemoveFile = async (filename: string) => {
        setDeletionStatus({ ...deletionStatus, [filename]: "pending" });

        try {
            const idToken = await getToken(client);
            if (!idToken) throw new Error("No authentication token available");

            await deleteUploadedFileApi(filename, idToken);
            setDeletionStatus({ ...deletionStatus, [filename]: "success" });
            await listUploadedFiles(idToken);
        } catch (error) {
            setDeletionStatus({ ...deletionStatus, [filename]: "error" });
            console.error(error);
        }
    };

    // 🔹 Upload file
    // Handler for the form submission (file upload)
    const handleUploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true); // Start the loading state
        const file: File = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const idToken = await getToken(client);
            if (!idToken) throw new Error("No authentication token available");

            const response: SimpleAPIResponse = await uploadFileApi(formData, idToken);
            setUploadedFile(response);
            setIsUploading(false);
            setUploadedFileError(undefined);
            await listUploadedFiles(idToken);
        } catch (error) {
            console.error(error);
            setIsUploading(false);
            setUploadedFileError(t("upload.uploadedFileError"));
        }
    };

    // 🔹 Extracted content so we can reuse it in Callout + Panel
    const renderUploadContent = () => (
        <div>
            <form encType="multipart/form-data">
                <div>
                    <Label>{t("upload.fileLabel")}</Label>
                    <input
                        accept=".txt, .md, .json, .png, .jpg, .jpeg, .bmp, .heic, .tiff, .pdf, .docx, .xlsx, .pptx, .html"
                        className={styles.chooseFiles}
                        type="file"
                        onChange={handleUploadFile}
                    />
                </div>
            </form>

            {/* Show a loading message while files are being uploaded */}
            {isUploading && <Text>{t("upload.uploadingFiles")}</Text>}
            {!isUploading && uploadedFileError && <Text>{uploadedFileError}</Text>}
            {!isUploading && uploadedFile && <Text>{uploadedFile.message}</Text>}

            {/* Display the list of already uploaded */}
            <h3>{t("upload.uploadedFilesLabel")}</h3>

            {isLoading && <Text>{t("upload.loading")}</Text>}
            {!isLoading && uploadedFiles.length === 0 && <Text>{t("upload.noFilesUploaded")}</Text>}
            {uploadedFiles.map((filename, index) => (
                <div key={index} className={styles.list}>
                    <div className={styles.item}>{filename}</div>
                    {/* Button to remove a file from the list */}
                    <Button
                        icon={<Delete24Regular />}
                        onClick={() => handleRemoveFile(filename)}
                        disabled={deletionStatus[filename] === "pending" || deletionStatus[filename] === "success"}
                    >
                        {!deletionStatus[filename] && t("upload.deleteFile")}
                        {deletionStatus[filename] === "pending" && t("upload.deletingFile")}
                        {deletionStatus[filename] === "error" && t("upload.errorDeleting")}
                        {deletionStatus[filename] === "success" && t("upload.fileDeleted")}
                    </Button>
                </div>
            ))}
        </div>
    );

    // 🔹 If panel mode
    if (asPanel) {
        return (
            <Panel
                headerText={t("upload.manageFileUploads")}
                isOpen={isOpen}
                isBlocking={false}
                onDismiss={onDismiss}
                closeButtonAriaLabel={t("labels.closeButton")}
                onRenderFooterContent={() => <DefaultButton onClick={onDismiss} text={t("labels.closeButton")} className={styles.panelCloseButton} />}
                isFooterAtBottom
            >
                {renderUploadContent()}
            </Panel>
        );
    }

    // 🔹 Default Callout mode
    return (
        <div className={`${styles.container} ${className ?? ""}`}>
            <Button id="calloutButton" icon={<Add24Regular />} disabled={disabled} onClick={handleButtonClick} className={styles.responsiveButton}>
                <span className={styles.buttonText}>{t("upload.manageFileUploads")}</span>
            </Button>

            {isCalloutVisible && (
                <Callout
                    role="dialog"
                    gapSpace={0}
                    className={styles.callout}
                    target="#calloutButton"
                    onDismiss={() => setIsCalloutVisible(false)}
                    setInitialFocus
                >
                    {renderUploadContent()}
                </Callout>
            )}
        </div>
    );
};
