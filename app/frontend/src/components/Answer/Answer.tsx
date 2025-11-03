import React, { useMemo, useState, useEffect, useRef } from "react";
import { Stack, IconButton } from "@fluentui/react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import styles from "./Answer.module.css";
import { ChatAppResponse, getCitationFilePath, SpeechConfig } from "../../api";
import { parseAnswerToHtml } from "./AnswerParser";
import { AnswerIcon } from "./AnswerIcon";
import { SpeechOutputBrowser } from "./SpeechOutputBrowser";
import { SpeechOutputAzure } from "./SpeechOutputAzure";

import { AppIconButton } from "../../ui/AppIconButton";

interface Props {
    answer: ChatAppResponse;
    index: number;
    speechConfig: SpeechConfig;
    isSelected?: boolean;
    isStreaming: boolean;
    onCitationClicked: (filePath: string) => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onFollowupQuestionClicked?: (question: string) => void;
    showFollowupQuestions?: boolean;
    showSpeechOutputBrowser?: boolean;
    showSpeechOutputAzure?: boolean;
    sessionId?: string;
}

export const Answer = ({
    answer,
    index,
    speechConfig,
    isSelected,
    isStreaming,
    onCitationClicked,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onFollowupQuestionClicked,
    showFollowupQuestions,
    showSpeechOutputAzure,
    showSpeechOutputBrowser,
    sessionId,
}: Props) => {
    const followupQuestions = answer.context?.followup_questions;
    const parsedAnswer = useMemo(() => parseAnswerToHtml(answer, isStreaming, onCitationClicked), [answer, isStreaming]);
    const { citations } = parsedAnswer;

    const renderedRef = useRef<HTMLDivElement | null>(null);

    const chatId =
        (typeof sessionId === "string" && sessionId) ||
        (typeof answer.session_state === "string" && answer.session_state) ||
        (answer as any)?.context?.session_id ||
        "unknown-session";

    const answerOrdinal = index;

    const trackOnce = (key: string) => {
        if (localStorage.getItem(key)) return false;
        localStorage.setItem(key, "1");
        return true;
    };

    useEffect(() => {
        if (isStreaming || citations.length === 0) return;
        const unique = Array.from(new Set(citations));
        unique.forEach(c => {
            const url = getCitationFilePath(c);
            const key = `cite:${chatId}:${answerOrdinal}:${url}`;
            if (!trackOnce(key)) return;
            fetch(url, { method: "HEAD" }).catch(() => {});
        });
    }, [isStreaming, citations, chatId, answerOrdinal]);

    const [vote, setVote] = useState<null | "up" | "down">(null);
    const votingDisabled = isStreaming;
    const voteKey = `vote:${chatId}:${answerOrdinal}`;

    useEffect(() => {
        const saved = localStorage.getItem(voteKey);
        if (saved === "up" || saved === "down") {
            setVote(saved as "up" | "down");
        } else {
            setVote(null);
        }
    }, [voteKey]);

    const handleVote = async (dir: "up" | "down") => {
        if (votingDisabled || vote !== null) return;
        setVote(dir);
        try {
            localStorage.setItem(voteKey, dir);
            await fetch(`/api/feedback_vote_${dir}`, { method: "POST" });
        } catch {}
    };

    const { t } = useTranslation();
    const sanitizedAnswerHtml = DOMPurify.sanitize(parsedAnswer.answerHtml);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const textToCopy = sanitizedAnswerHtml.replace(/<a [^>]*><sup>\d+<\/sup><\/a>|<[^>]+>/g, "");

        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => console.error("Failed to copy text: ", err));
    };

    return (
        <Stack className={`${styles.answerContainer} ${isSelected && styles.selected}`} verticalAlign="space-between">
            <Stack.Item grow>
                <div className={styles.answerText} ref={renderedRef}>
                    <ReactMarkdown children={sanitizedAnswerHtml} rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]} />
                </div>
            </Stack.Item>

            {!!parsedAnswer.citations.length && (
                <Stack.Item>
                    <Stack horizontal wrap tokens={{ childrenGap: 5 }}>
                        <span className={styles.citationLearnMore}>{t("citationWithColon")}</span>
                        <span style={{ flexBasis: "100%" }} />
                        {parsedAnswer.citations.map((x, i) => {
                            const path = getCitationFilePath(x);
                            return (
                                <a key={i} className={styles.citation} title={x} onClick={() => onCitationClicked(path)}>
                                    {`${++i}. ${x}`}
                                </a>
                            );
                        })}
                    </Stack>
                </Stack.Item>
            )}

            {!!followupQuestions?.length && showFollowupQuestions && onFollowupQuestionClicked && (
                <Stack.Item>
                    <Stack horizontal wrap className={`${!!parsedAnswer.citations.length ? styles.followupQuestionsList : ""}`} tokens={{ childrenGap: 6 }}>
                        <span className={styles.followupQuestionLearnMore}>{t("followupQuestions")}</span>
                        {followupQuestions.map((x, i) => {
                            return (
                                <a key={i} className={styles.followupQuestion} title={x} onClick={() => onFollowupQuestionClicked(x)}>
                                    {`${x}`}
                                </a>
                            );
                        })}
                    </Stack>
                </Stack.Item>
            )}
            <Stack.Item>
                <div className={`${styles.toolbar} : styles.toolbarHidden}`}>
                    <AppIconButton
                        icon={copied ? "check" : "copy"}
                        title={copied ? t("tooltips.copied") : t("tooltips.copy")}
                        className={copied ? styles.AnswerCopied : undefined}
                        onClick={handleCopy}
                    />
                    {vote !== "down" && (
                        <AppIconButton
                            icon="thumbsup"
                            className={vote === "up" ? styles.answerVote : undefined}
                            title={t("tooltips.thumbsup")}
                            aria-label={t("tooltips.thumbsup")}
                            onClick={vote === null ? () => handleVote("up") : undefined}
                            disabled={vote !== null}
                        />
                    )}
                    {vote !== "up" && (
                        <AppIconButton
                            icon="thumbsdown"
                            className={vote === "down" ? styles.answerVote : undefined}
                            title={t("tooltips.thumbsdown")}
                            aria-label={t("tooltips.thumbsdown")}
                            onClick={vote === null ? () => handleVote("down") : undefined}
                            disabled={vote !== null}
                        />
                    )}
                    <AppIconButton
                        icon="download"
                        title={t("tooltips.save")}
                        aria-label={t("tooltips.save")}
                        onClick={async () => {
                            try {
                                const htmlToSend = renderedRef.current?.innerHTML ?? sanitizedAnswerHtml;

                                const res = await fetch("/api/generate_file", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ html: htmlToSend })
                                });
                                if (!res.ok) throw new Error(`Server returned ${res.status}`);

                                const cd = res.headers.get("content-disposition") || "";
                                const m = cd.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
                                const filename = m
                                    ? decodeURIComponent(m[2])
                                    : `anbudsbot-${new Date()
                                          .toISOString()
                                          .replace(/[-:TZ.]/g, "")
                                          .slice(0, 15)}.docx`;

                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                            } catch (err) {
                                console.error("Save failed:", err);
                            }
                        }}
                    />
                    <AppIconButton
                        icon="lightbulb"
                        title={t("tooltips.showThoughtProcess")}
                        aria-label={t("tooltips.showThoughtProcess")}
                        onClick={() => onThoughtProcessClicked()}
                        disabled={!answer.context.thoughts?.length || isStreaming}
                    />
                    <AppIconButton
                        icon="clipboardList"
                        title={t("tooltips.showSupportingContent")}
                        aria-label={t("tooltips.showSupportingContent")}
                        onClick={() => onSupportingContentClicked()}
                        disabled={!answer.context.data_points || isStreaming}
                    />
                    {showSpeechOutputAzure && (
                        <SpeechOutputAzure answer={sanitizedAnswerHtml} index={index} speechConfig={speechConfig} isStreaming={isStreaming} />
                    )}
                    {showSpeechOutputBrowser && <SpeechOutputBrowser answer={sanitizedAnswerHtml} />}
                </div>
            </Stack.Item>
        </Stack>
    );
};
