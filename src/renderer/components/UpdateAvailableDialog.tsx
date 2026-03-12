import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Loader2, RefreshCw, CheckCircle } from "lucide-react";

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | string[];
}

interface UpdateAvailableDialogProps {
  open: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  onDownload: () => void;
  onInstallAndRestart: () => void;
}

export function UpdateAvailableDialog({
  open,
  onClose,
  updateInfo,
  isDownloading = false,
  isDownloaded = false,
  onDownload,
  onInstallAndRestart,
}: UpdateAvailableDialogProps) {
  const formatReleaseNotes = (notes: string | string[] | undefined) => {
    if (!notes) return null;
    if (typeof notes === "string") return notes;
    if (Array.isArray(notes)) return notes.join("\n");
    return null;
  };

  const releaseNotes = formatReleaseNotes(updateInfo.releaseNotes);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isDownloading && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDownloaded ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Update Ready to Install
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 text-blue-600" />
                New Version Available
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDownloaded
              ? "The update has been downloaded. Restart the application to install the new version."
              : `OmniLedger ${updateInfo.version} is available. Would you like to download and install it?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">New version:</span>
              <span className="text-primary font-semibold">v{updateInfo.version}</span>
            </div>
            {updateInfo.releaseDate && (
              <div className="text-sm text-muted-foreground">
                Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {releaseNotes && (
            <Alert>
              <AlertTitle>What&apos;s New</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {releaseNotes}
              </AlertDescription>
            </Alert>
          )}

          {isDownloading && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertTitle className="text-blue-800">Downloading...</AlertTitle>
              <AlertDescription className="text-blue-700">
                Please wait while the update is being downloaded. You can continue using the app.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {!isDownloaded ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isDownloading}>
                Later
              </Button>
              <Button onClick={onDownload} disabled={isDownloading} className="min-w-[140px]">
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Update
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Later
              </Button>
              <Button onClick={onInstallAndRestart} className="min-w-[180px]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart & Install
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
