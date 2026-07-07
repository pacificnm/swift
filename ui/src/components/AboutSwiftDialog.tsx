import { useEffect, useId, useState } from "react";
import { faCircleInfo, faXmark } from "../lib/fontawesome";
import { APP_INFO } from "../lib/appInfo";
import { isTauri } from "../lib/tauri";
import { Icon } from "./Icon";

type AboutSwiftDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutSwiftDialog({ open, onClose }: AboutSwiftDialogProps) {
  const titleId = useId();
  const descId = useId();
  const [productName, setProductName] = useState<string>(APP_INFO.name);
  const [version, setVersion] = useState<string>(APP_INFO.version);

  useEffect(() => {
    if (!open) {
      setProductName(APP_INFO.name);
      setVersion(APP_INFO.version);
      return;
    }

    if (!isTauri()) {
      return;
    }

    void (async () => {
      try {
        const app = await import("@tauri-apps/api/app");
        const [name, ver] = await Promise.all([app.getName(), app.getVersion()]);
        setProductName(name);
        setVersion(ver);
      } catch {
        // Keep static fallbacks when Tauri app API is unavailable.
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md overflow-hidden rounded-nest-lg border border-nest-border bg-nest-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-nest-border bg-nest-primary px-5 py-3 text-white">
          <div className="flex items-center gap-2">
            <Icon icon={faCircleInfo} className="size-4 opacity-90" />
            <h2 id={titleId} className="text-sm font-semibold">
              About {productName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-nest-sm p-1 hover:bg-white/15"
            aria-label="Close"
          >
            <Icon icon={faXmark} className="size-3.5" />
          </button>
        </header>

        <div id={descId} className="space-y-4 px-5 py-5">
          <div className="flex items-start gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-nest-md bg-nest-primary text-xl font-bold text-white"
              aria-hidden
            >
              S
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-nest-foreground">{productName}</p>
              <p className="text-sm text-nest-muted">Version {version}</p>
              <p className="text-sm leading-relaxed text-nest-foreground">{APP_INFO.tagline}</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-nest-foreground">{APP_INFO.description}</p>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-nest-muted">Phase</dt>
            <dd>{APP_INFO.phase}</dd>
            <dt className="text-nest-muted">Platform</dt>
            <dd>{APP_INFO.stack}</dd>
            <dt className="text-nest-muted">Identifier</dt>
            <dd className="font-mono text-xs">{APP_INFO.identifier}</dd>
          </dl>

          <p className="border-t border-nest-border pt-3 text-xs text-nest-muted">
            © {new Date().getFullYear()} {APP_INFO.copyright}. All rights reserved.
          </p>
        </div>

        <footer className="flex justify-end border-t border-nest-border px-5 py-3">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-nest-md bg-nest-primary px-5 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
          >
            OK
          </button>
        </footer>
      </div>
    </div>
  );
}
