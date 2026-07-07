import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  faBold,
  faItalic,
  faListOl,
  faListUl,
  faStrikethrough,
  faUnderline,
} from "../lib/fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "./Icon";

type RichTextEditorProps = {
  /** Current HTML value. */
  value: string;
  /** Called with the new HTML on every edit. */
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

/** HTML that a contentEditable produces when it holds no visible content. */
function isEmptyHtml(html: string): boolean {
  const stripped = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<div>\s*<\/div>/gi, "")
    .replace(/&nbsp;/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
  return stripped.length === 0;
}

const TOOLBAR: { command: string; icon: IconDefinition; label: string }[] = [
  { command: "bold", icon: faBold, label: "Bold" },
  { command: "italic", icon: faItalic, label: "Italic" },
  { command: "underline", icon: faUnderline, label: "Underline" },
  { command: "strikeThrough", icon: faStrikethrough, label: "Strikethrough" },
  { command: "insertUnorderedList", icon: faListUl, label: "Bullet list" },
  { command: "insertOrderedList", icon: faListOl, label: "Numbered list" },
];

/**
 * Lightweight rich-text editor over a `contentEditable` element.
 *
 * Stores its content as HTML. Formatting uses `document.execCommand`, which is
 * still supported by the Chromium/WebKit runtimes Tauri ships. The DOM is only
 * re-synced from `value` when it differs from the live content, so the caret is
 * preserved while typing.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = "",
  ariaLabel,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && value !== el.innerHTML) {
      el.innerHTML = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (el) {
      onChange(el.innerHTML);
    }
  }, [onChange]);

  const runCommand = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, command: string) => {
      // Keep the editor's selection: don't let the button steal focus.
      event.preventDefault();
      ref.current?.focus();
      document.execCommand(command, false);
      emit();
    },
    [emit],
  );

  const showPlaceholder = isEmptyHtml(value);

  return (
    <div
      className={[
        "flex min-h-0 flex-col overflow-hidden rounded-nest-md border border-nest-border bg-nest-background focus-within:border-nest-primary focus-within:ring-1 focus-within:ring-nest-primary/30",
        className,
      ].join(" ")}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-nest-border bg-nest-surface px-1.5 py-1">
        {TOOLBAR.map((item) => (
          <button
            key={item.command}
            type="button"
            title={item.label}
            aria-label={item.label}
            onMouseDown={(event) => runCommand(event, item.command)}
            className="flex size-6 items-center justify-center rounded-nest-sm text-nest-muted hover:bg-nest-primary/10 hover:text-nest-foreground"
          >
            <Icon icon={item.icon} className="size-3" />
          </button>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        {showPlaceholder && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-nest-muted">
            {placeholder}
          </span>
        ) : null}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel ?? placeholder}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          className="nest-rich-text min-h-full px-3 py-2 text-nest-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
