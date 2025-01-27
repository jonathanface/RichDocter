import { IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import styles from './documentexporter.module.css';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { DocumentExportType } from "../../../types/DocumentExport";
import { useCurrentSelections } from "../../../hooks/useCurrentSelections";
import { useAlertContext } from "../../../contexts/alert";
import { AlertCommandType, AlertFunctionCall, AlertToastType } from "../../../types/AlertToasts";
import Exporter from "../../../utils/Exporter";
import { useFetchUserData } from "../../../hooks/useFetchUserData";

export const DocumentExporter = () => {

    const [isOpen, setIsOpen] = useState(false);
    const { currentStory } = useCurrentSelections();
    const { setAlertState } = useAlertContext();
    const { userDetails } = useFetchUserData();

    const exportDoc = async (type: DocumentExportType) => {
        if (currentStory) {
            setAlertState({
                title: "Conversion in progress",
                message: "A download link will be provided when the process is complete.",
                open: true,
                severity: AlertToastType.info,
            });

            const exp = new Exporter(currentStory);

            const htmlData = await exp.lexicalToHtml();
            try {
                const response = await fetch("/api/stories/" + currentStory.story_id + "/export?type=" + type, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        html_by_chapter: htmlData,
                        title: currentStory.title,
                        storyID: currentStory.story_id,
                        type
                    }),
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        const subscribeFunc: AlertFunctionCall = {
                            type: AlertCommandType.subscribe,
                            text: "subscribe",
                        };
                        setAlertState({
                            title: "Insufficient subscription",
                            message: "Free accounts are unable to export their stories.",
                            open: true,
                            severity: AlertToastType.warning,
                            timeout: 6000,
                            callback: subscribeFunc,
                        });
                        return;
                    } else {
                        throw new Error("Fetch problem export " + response.status);
                    }
                }
                const json = await response.json();

                const alertLink = {
                    url: json.url,
                    text: "download/open",
                };
                setAlertState({
                    title: "Conversion complete",
                    message: "Right-click the link to save your document.",
                    open: true,
                    severity: AlertToastType.success,
                    link: alertLink,
                    timeout: undefined,
                });
            } catch (error) {
                console.error(error);
                setAlertState({
                    title: "Error",
                    message:
                        "Unable to export your document at this time. Please try again later, or contact support@richdocter.io.",
                    open: true,
                    severity: AlertToastType.error,
                });
            }
        }
    };
    console.log("user", userDetails);
    let altText = "Export document.";
    let disabled = false;
    if (!userDetails?.subscription_id.length) {
        altText += "\nThis feature is available to subscribers only"
        disabled = true;
    }
    return (
        <div className={styles.exporter}>
            <Tooltip title={altText}>
                <span>
                    <IconButton className={styles.parentButton} aria-label="export"
                        disabled={disabled}
                        onClick={() => setIsOpen(!isOpen)}
                        onMouseEnter={() => setIsOpen(true)}
                        onMouseLeave={() => setIsOpen(false)}>
                        <FileDownloadIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            {isOpen && (
                <ul onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}>
                    <li onClick={() => exportDoc(DocumentExportType.pdf)}>PDF</li>
                    <li onClick={() => exportDoc(DocumentExportType.docx)}>DOCX</li>
                </ul>
            )}
        </div>
    )
}