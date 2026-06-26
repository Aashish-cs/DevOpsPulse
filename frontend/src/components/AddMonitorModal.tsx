import { X } from "lucide-react";
import { useState, type FormEvent } from "react";

type AddMonitorModalProps = {
  open: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: { name: string; url: string; checkIntervalMinutes: number }) => Promise<void>;
};

export function AddMonitorModal({ open, submitting, error, onClose, onSubmit }: AddMonitorModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(5);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, url, checkIntervalMinutes });
    setName("");
    setUrl("");
    setCheckIntervalMinutes(5);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-monitor-title">
        <div className="modal-header">
          <h2 id="add-monitor-title">Add monitor</h2>
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
              {submitting ? "Adding..." : "Add monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
