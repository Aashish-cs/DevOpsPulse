import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type MonitorFormInput = {
  name: string;
  url: string;
  checkIntervalMinutes: number;
};

type AddMonitorModalProps = {
  open: boolean;
  mode: "create" | "edit";
  submitting: boolean;
  error: string | null;
  initialValues?: MonitorFormInput;
  onClose: () => void;
  onSubmit: (input: MonitorFormInput) => Promise<boolean>;
};

export function AddMonitorModal({
  open,
  mode,
  submitting,
  error,
  initialValues,
  onClose,
  onSubmit
}: AddMonitorModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(5);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialValues?.name ?? "");
    setUrl(initialValues?.url ?? "");
    setCheckIntervalMinutes(initialValues?.checkIntervalMinutes ?? 5);
  }, [initialValues?.checkIntervalMinutes, initialValues?.name, initialValues?.url, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const succeeded = await onSubmit({ name: name.trim(), url: url.trim(), checkIntervalMinutes });

    if (succeeded && mode === "create") {
      setName("");
      setUrl("");
      setCheckIntervalMinutes(5);
    }
  }

  const title = mode === "edit" ? "Edit monitor" : "Add monitor";
  const submitText = mode === "edit" ? "Save changes" : "Add monitor";
  const submittingText = mode === "edit" ? "Saving..." : "Adding...";

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-monitor-title">
        <div className="modal-header">
          <h2 id="add-monitor-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close" title="Close">
            <X size={18} />
          </button>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
          </label>
          <label>
            URL
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              placeholder="https://example.com/health"
              required
            />
          </label>
          <label>
            Interval
            <select
              value={checkIntervalMinutes}
              onChange={(event) => setCheckIntervalMinutes(Number(event.target.value))}
            >
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? submittingText : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
