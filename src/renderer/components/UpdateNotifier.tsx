import { useEffect, useState } from "react";
import { UpdateAvailableDialog, type UpdateInfo } from "./UpdateAvailableDialog";

declare const window: Window & {
  electronAPI?: {
    onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void;
    onUpdateDownloaded: (cb: () => void) => () => void;
    onUpdateError: (cb: (error: string) => void) => () => void;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    quitAndInstall: () => Promise<{ success: boolean; error?: string }>;
  };
};

export function UpdateNotifier() {
  const [showDialog, setShowDialog] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onUpdateAvailable) return;

    const unsubAvailable = api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setIsDownloaded(false);
      setIsDownloading(false);
      setShowDialog(true);
    });

    const unsubDownloaded = api.onUpdateDownloaded(() => {
      setIsDownloading(false);
      setIsDownloaded(true);
    });

    const unsubError = api.onUpdateError((error) => {
      console.error("Update error:", error);
      setIsDownloading(false);
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  const handleDownload = async () => {
    const result = await window.electronAPI?.downloadUpdate?.();
    if (result?.success) {
      setIsDownloading(true);
    } else if (result?.error) {
      console.error("Download failed:", result.error);
    }
  };

  const handleInstallAndRestart = async () => {
    await window.electronAPI?.quitAndInstall?.();
  };

  if (!updateInfo || !showDialog) return null;

  return (
    <UpdateAvailableDialog
      open={showDialog}
      onClose={() => setShowDialog(false)}
      updateInfo={updateInfo}
      isDownloading={isDownloading}
      isDownloaded={isDownloaded}
      onDownload={handleDownload}
      onInstallAndRestart={handleInstallAndRestart}
    />
  );
}
