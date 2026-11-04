import { useState, type RefObject } from 'react';
import { ClipboardPlus, Plus, SlidersHorizontal } from 'lucide-react';

interface Props {
  onAdd: (title: string) => void;
  onAddWithDetails: (title: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function QuickAdd({ onAdd, onAddWithDetails, inputRef }: Props) {
  const [title, setTitle] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      onAddWithDetails(''); // nothing typed yet, so open the full form instead
      return;
    }
    onAdd(trimmed);
    setTitle('');
  };

  return (
    <form className="quick-add" onSubmit={submit} noValidate>
      <div className="quick-field">
        <span className="quick-icon" aria-hidden="true">
          <ClipboardPlus size={17} />
        </span>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          aria-label="New task title"
          maxLength={120}
        />
        <button type="button" className="quick-more" onClick={() => onAddWithDetails(title)}>
          <SlidersHorizontal size={14} aria-hidden="true" /> Add details
        </button>
      </div>
      <button type="submit" className="button button-primary quick-submit">
        <Plus size={17} strokeWidth={2.5} aria-hidden="true" /> Add task
      </button>
    </form>
  );
}
