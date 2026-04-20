import { useEffect, useState } from "react";
import { UpdateAvailableDialog, type UpdateInfo } from "./UpdateAvailableDialog";

declare const window: Window & {
  electronAPI?: {
    onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void;
    onUpdateDownloaded: (cb: () => void) => () => void;
    onUpdateError: (cb: (error: string) => void) => () => void;
    getPendingUpdate?: () => Promise<{
      success: boolean;
      updateInfo?: UpdateInfo | null;
      downloaded?: boolean;
      error?: string | null;
    }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    quitAndInstall: () => Promise<{ success: boolean; error?: string }>;
  };
};

export function UpdateNotifier() {
  const [showDialog, setShowDialog] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onUpdateAvailable) return;

    let cancelled = false;

    const unsubAvailable = api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setIsDownloaded(false);
      setIsDownloading(false);
      setDownloadError(null);
      setShowDialog(true);
    });

    const unsubDownloaded = api.onUpdateDownloaded(() => {
      setIsDownloading(false);
      setIsDownloaded(true);
      setDownloadError(null);
    });

    const unsubError = api.onUpdateError((error) => {
      console.error("Update error:", error);
      setIsDownloading(false);
      setDownloadError(error);
    });

    // Pull any update state captured by the main process before this
    // component mounted. Without this, an `update-available` event that
    // fires during app startup (which is the common case, since the main
    // process checks on launch) would be missed entirely.
    void (async () => {
      try {
        const result = await api.getPendingUpdate?.();
        if (cancelled || !result?.success) return;
        if (result.updateInfo) {
          setUpdateInfo(result.updateInfo);
          setIsDownloaded(Boolean(result.downloaded));
          setIsDownloading(false);
          setDownloadError(result.error ?? null);
          setShowDialog(true);
        } else if (result.error) {
          setDownloadError(result.error);
        }
      } catch (err) {
        console.error("Failed to fetch pending update:", err);
      }
    })();

    return () => {
      cancelled = true;
      unsubAvailable();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  const handleDownload = async () => {
    const invoke = window.electronAPI?.downloadUpdate;
    if (!invoke) {
      setDownloadError(
        "In-app updates only run in the installed app. Use a release build to download updates."
      );
      return;
    }
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const result = await invoke();
      if (!result?.success) {
        setDownloadError(result?.error ?? "Download failed.");
        setIsDownloading(false);
      }
    } catch (e) {
      setDownloadError(
        e instanceof Error ? e.message : "Download failed unexpectedly."
      );
      setIsDownloading(false);
    }
  };

  const handleInstallAndRestart = async () => {
    await window.electronAPI?.quitAndInstall?.();
  };

  if (!updateInfo || !showDialog) return null;

  return (
    <UpdateAvailableDialog
      open={showDialog}
      onClose={() => {
        setShowDialog(false);
        setDownloadError(null);
      }}
      updateInfo={updateInfo}
      isDownloading={isDownloading}
      isDownloaded={isDownloaded}
      downloadError={downloadError}
      onDownload={handleDownload}
      onInstallAndRestart={handleInstallAndRestart}
    />
  );
}
