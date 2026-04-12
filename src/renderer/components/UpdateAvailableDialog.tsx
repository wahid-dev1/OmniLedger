import { useMemo } from "react";
import DOMPurify from "dompurify";
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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  /** Plain text or HTML from GitHub releases (normalized in main to a string when possible). */
  releaseNotes?: string | string[];
}

function normalizeReleaseNotesText(
  notes: string | string[] | undefined
): string | null {
  if (notes == null) return null;
  if (typeof notes === "string") {
    const t = notes.trim();
    return t.length ? t : null;
  }
  const joined = notes
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
  return joined.length ? joined : null;
}

function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

function sanitizeReleaseNotesHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  try {
    const doc = new DOMParser().parseFromString(clean, "text/html");
    doc.querySelectorAll("a[href]").forEach((el) => {
      el.setAttribute("rel", "noopener noreferrer");
      el.setAttribute("target", "_blank");
    });
    return doc.body.innerHTML;
  } catch {
    return clean;
  }
}

interface UpdateAvailableDialogProps {
  open: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  downloadError?: string | null;
  onDownload: () => void;
  onInstallAndRestart: () => void;
}

export function UpdateAvailableDialog({
  open,
  onClose,
  updateInfo,
  isDownloading = false,
  isDownloaded = false,
  downloadError = null,
  onDownload,
  onInstallAndRestart,
}: UpdateAvailableDialogProps) {
  const releaseNotesRaw = normalizeReleaseNotesText(updateInfo.releaseNotes);

  const { isHtml, html, text } = useMemo(() => {
    if (!releaseNotesRaw) {
      return { isHtml: false, html: "", text: "" as string | null };
    }
    if (looksLikeHtml(releaseNotesRaw)) {
      return {
        isHtml: true,
        html: sanitizeReleaseNotesHtml(releaseNotesRaw),
        text: null,
      };
    }
    return { isHtml: false, html: "", text: releaseNotesRaw };
  }, [releaseNotesRaw]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isDownloading && onClose()}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-[min(100vw-2rem,520px)]",
          "border-border bg-background text-foreground shadow-xl"
        )}
      >
        <div className="border-b border-border bg-muted/40 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              {isDownloaded ? (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </span>
                  Update ready to install
                </>
              ) : (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <RefreshCw className="h-5 w-5 text-primary" />
                  </span>
                  New version available
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
              {isDownloaded
                ? "The update has been downloaded. Restart OmniLedger to finish installing."
                : `OmniLedger ${updateInfo.version} is ready. Download the update in the background, then restart when prompted.`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableBody>
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell className="w-[38%] py-3 font-medium text-muted-foreground">
                    New version
                  </TableCell>
                  <TableCell className="py-3 text-right font-semibold text-primary">
                    v{updateInfo.version}
                  </TableCell>
                </TableRow>
                {updateInfo.releaseDate ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell className="py-3 font-medium text-muted-foreground">
                      Released
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm text-foreground">
                      {new Date(updateInfo.releaseDate).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {releaseNotesRaw ? (
            <div className="rounded-lg border border-border bg-muted/30">
              <div className="border-b border-border px-4 py-2.5">
                <p className="text-sm font-medium text-foreground">
                  What&apos;s new
                </p>
              </div>
              <div className="max-h-[220px] overflow-y-auto px-4 py-3">
                {isHtml ? (
                  <div
                    className={cn(
                      "update-release-notes text-sm leading-relaxed text-foreground",
                      "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
                      "[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold",
                      "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold first:[&_h2]:mt-0",
                      "[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium",
                      "[&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0",
                      "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
                      "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
                      "[&_li]:my-0.5",
                      "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
                      "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
                    )}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {text}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {downloadError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not download update</AlertTitle>
              <AlertDescription>{downloadError}</AlertDescription>
            </Alert>
          ) : null}

          {isDownloading ? (
            <Alert className="border-primary/25 bg-primary/5">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <AlertTitle className="text-foreground">Downloading update</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                This may take a few minutes. You can keep using OmniLedger; we will
                notify you when the download finishes.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:gap-2">
          {!isDownloaded ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isDownloading}
                className="sm:min-w-[100px]"
              >
                Later
              </Button>
              <Button
                type="button"
                onClick={onDownload}
                disabled={isDownloading}
                className="min-w-[160px] gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    Downloading…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 shrink-0" />
                    Download update
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="sm:min-w-[100px]"
              >
                Later
              </Button>
              <Button
                type="button"
                onClick={onInstallAndRestart}
                className="min-w-[180px] gap-2"
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                Restart & install
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
