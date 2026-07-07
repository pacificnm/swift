import { useEffect, useState } from "react";
import { faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { useProjectView, PROJECT_VIEW_LABELS } from "../../context/ProjectViewContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";

const WEEKDAYS = [
  { key: "mon", label: "Monday", working: true, hours: "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM" },
  { key: "tue", label: "Tuesday", working: true, hours: "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM" },
  { key: "wed", label: "Wednesday", working: true, hours: "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM" },
  { key: "thu", label: "Thursday", working: true, hours: "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM" },
  { key: "fri", label: "Friday", working: true, hours: "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM" },
  { key: "sat", label: "Saturday", working: false, hours: "Nonworking" },
  { key: "sun", label: "Sunday", working: false, hours: "Nonworking" },
] as const;

export function WorkingTimeView() {
  const { returnView, closeToWorkspace } = useProjectView();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const [calendarName, setCalendarName] = useState("Standard");

  const handleOk = () => {
    setStatus(`Working time calendar saved (mock): ${calendarName}`, { variant: "success" });
    toast.success(`Returning to ${PROJECT_VIEW_LABELS[returnView]}`);
    closeToWorkspace();
  };

  const handleCancel = () => {
    setStatus(`Returned to ${PROJECT_VIEW_LABELS[returnView]}`, { variant: "info" });
    closeToWorkspace();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStatus(`Returned to ${PROJECT_VIEW_LABELS[returnView]}`, { variant: "info" });
        closeToWorkspace();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeToWorkspace, returnView, setStatus]);

  return (
    <div className="flex h-full flex-col overflow-auto bg-nest-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Change Working Time</h1>
            <p className="mt-1 text-sm text-nest-muted">
              Mock calendar for this project — Microsoft Project → Project → Change Working Time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-nest-sm p-1.5 text-nest-muted hover:bg-nest-surface hover:text-nest-foreground"
            aria-label="Close"
            title="Close"
          >
            <Icon icon={faXmark} className="size-4" />
          </button>
        </header>

        <form
          className="flex flex-1 flex-col gap-4 rounded-nest-lg border border-nest-border bg-nest-surface p-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleOk();
          }}
        >
          <label className="block max-w-md">
            <span className="text-xs font-medium text-nest-muted">For calendar</span>
            <select
              value={calendarName}
              onChange={(event) => setCalendarName(event.target.value)}
              className="mt-1 w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
            >
              <option value="Standard">Standard</option>
              <option value="Night Shift">Night Shift</option>
              <option value="24 Hours">24 Hours</option>
            </select>
          </label>

          <div className="overflow-hidden rounded-nest-md border border-nest-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-nest-border bg-nest-muted/10 text-left text-xs text-nest-muted">
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 font-medium">Working?</th>
                  <th className="px-3 py-2 font-medium">Working hours</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((day) => (
                  <tr key={day.key} className="border-b border-nest-border/60 last:border-b-0">
                    <td className="px-3 py-2 font-medium text-nest-foreground">{day.label}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={day.working}
                        readOnly
                        className="size-3.5 rounded border-nest-border text-nest-primary"
                        aria-label={`${day.label} working`}
                      />
                    </td>
                    <td className="px-3 py-2 text-nest-muted">{day.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-nest-muted">
            Exceptions and detailed shift editing — phase 2. Calendar selection is mock-only.
          </p>

          <footer className="mt-auto flex justify-end gap-2 border-t border-nest-border pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-nest-md border border-nest-border px-4 py-2 text-sm text-nest-foreground hover:bg-nest-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-nest-md bg-nest-primary px-4 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
            >
              OK
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
