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

/**
 * Some sources (e.g. electron-updater pulling from GitHub releases) deliver
 * release notes with their HTML already entity-encoded (`&lt;h2&gt;`). Decode
 * those so we can detect and render the underlying markup.
 */
function decodeHtmlEntities(s: string): string {
  if (!/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(s)) return s;
  try {
    const el = document.createElement("textarea");
    el.innerHTML = s;
    return el.value;
  } catch {
    return s;
  }
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
    const decoded = decodeHtmlEntities(releaseNotesRaw);
    if (looksLikeHtml(decoded)) {
      return {
        isHtml: true,
        html: sanitizeReleaseNotesHtml(decoded),
        text: null,
      };
    }
    return { isHtml: false, html: "", text: decoded };
  }, [releaseNotesRaw]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isDownloading && onClose()}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0",
          "w-[calc(100vw-1.5rem)] max-w-[640px]",
          "max-h-[calc(100vh-2rem)]",
          "grid-rows-[auto_minmax(0,1fr)_auto]",
          "border-border bg-background text-foreground shadow-xl"
        )}
      >
        <div className="border-b border-border bg-muted/40 px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight sm:text-xl">
              {isDownloaded ? (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/15 sm:h-10 sm:w-10">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </span>
                  <span className="min-w-0 break-words">Update ready to install</span>
                </>
              ) : (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10">
                    <RefreshCw className="h-5 w-5 text-primary" />
                  </span>
                  <span className="min-w-0 break-words">New update available</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
              {isDownloaded
                ? "The update has been downloaded. Restart OmniLedger to finish installing."
                : `New update available: OmniLedger ${updateInfo.version}. Download it in the background, then restart when prompted.`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
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
            <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
              <div className="border-b border-border px-4 py-2.5">
                <p className="text-sm font-medium text-foreground">
                  What&apos;s new
                </p>
              </div>
              <div className="max-h-[40vh] min-h-[120px] overflow-y-auto px-4 py-3 sm:max-h-[260px]">
                {isHtml ? (
                  <div
                    className={cn(
                      "update-release-notes break-words text-sm leading-relaxed text-foreground",
                      "[&_*]:max-w-full [&_a]:break-all",
                      "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
                      "[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold",
                      "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold first:[&_h2]:mt-0",
                      "[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium",
                      "[&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0",
                      "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
                      "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
                      "[&_li]:my-0.5",
                      "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
                      "[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs",
                      "[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded",
                      "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
                    )}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
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

        <DialogFooter className="flex-col-reverse gap-2 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:gap-2 sm:px-6 sm:py-4">
          {!isDownloaded ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isDownloading}
                className="w-full sm:w-auto sm:min-w-[100px]"
              >
                Later
              </Button>
              <Button
                type="button"
                onClick={onDownload}
                disabled={isDownloading}
                className="w-full gap-2 sm:w-auto sm:min-w-[160px]"
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
                className="w-full sm:w-auto sm:min-w-[100px]"
              >
                Later
              </Button>
              <Button
                type="button"
                onClick={onInstallAndRestart}
                className="w-full gap-2 sm:w-auto sm:min-w-[180px]"
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
