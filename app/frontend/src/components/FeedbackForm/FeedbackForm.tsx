import React, { useState } from "react";
import styles from "./Feedback.module.css";
import { useTranslation } from "react-i18next";
import { Dialog, DialogFooter, DefaultButton, DialogType, PrimaryButton, TextField, Dropdown, IDropdownOption } from "@fluentui/react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORY_OPTIONS: IDropdownOption[] = [
    { key: "feil_svar", text: "Feil eller uklart svar" },
    { key: "forbedringsforslag", text: "Forslag til forbedring" },
    { key: "manglende_dokumentasjon", text: "Manglende dokumentasjon" },
    { key: "utdatert_informasjon", text: "Utdatert informasjon" },
    { key: "teknisk_problem", text: "Teknisk feil eller error" },
    { key: "annet", text: "Annet" }
];

export const FeedbackForm = ({ isOpen, onClose }: Props) => {
    const { t } = useTranslation();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [category, setCategory] = useState<string>("annet");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        const safeName = (name || "").trim() || "Anonym";
        const trimmedEmail = (email || "").trim();

        if (!message.trim()) {
            alert("Skriv inn en tilbakemelding før du sender.");
            return;
        }
        if (trimmedEmail && !/.+@.+\..+/.test(trimmedEmail)) {
            alert("E-postadressen ser ikke riktig ut.");
            return;
        }

        const payload = { name: safeName, email: trimmedEmail, category, message: message.trim() };

        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Takk! Tilbakemeldingen er sendt.");
                onClose();
                setName("");
                setEmail("");
                setCategory("annet");
                setMessage("");
            } else {
                alert("Noe gikk galt ved sending av tilbakemelding.");
            }
        } catch (error) {
            console.error("Feedback submission failed:", error);
            alert("Uventet feil oppstod.");
        }
    };

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
                containerClassName: styles.feedbackDialogContainer
            }}
        >
            <div className={styles.feedbackDialogContent}>
                <h1>Tilbakemelding</h1>
                <form onSubmit={handleSubmit} className={styles.formGrid}>
                    <TextField label="Navn" placeholder="Navn" value={name} onChange={(_, v) => setName(v || "")} className={styles.input} />

                    <TextField
                        label="E-post"
                        type="email"
                        placeholder="navn@firma.no"
                        value={email}
                        onChange={(_, v) => setEmail(v || "")}
                        description="Valgfritt: Fyll inn e-post hvis du ønsker svar/oppfølging."
                        className={styles.input}
                    />

                    <hr className={styles.sectionDivider} />

                    <Dropdown
                        label="Hva gjelder tilbakemeldingen?"
                        options={CATEGORY_OPTIONS}
                        selectedKey={category}
                        onChange={(_, option) => setCategory((option?.key as string) ?? "annet")}
                        placeholder="Velg tema"
                        className={styles.dropdown}
                    />

                    <TextField
                        label="Tilbakemelding"
                        multiline
                        rows={6}
                        required
                        value={message}
                        onChange={(_, v) => setMessage(v || "")}
                        className={styles.input}
                    />

                    <DialogFooter>
                        <DefaultButton onClick={onClose} text={t("Lukk")} className={styles.closeButton} />
                        <PrimaryButton type="submit" text="Send" className={styles.sendButton} />
                    </DialogFooter>
                </form>
            </div>
        </Dialog>
    );
};
