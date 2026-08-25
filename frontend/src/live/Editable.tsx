/**
 * A piece of the page you can type into.
 *
 * Off duty it renders exactly what the component would have rendered without
 * it: the same tag, the same styles, one extra attribute. That is the point —
 * edit mode has to be able to disappear completely, or the site people visit is
 * not the site being edited.
 *
 * On duty it becomes `contentEditable`. The browser's own text editing is worth
 * more than any input overlay: the text keeps its real font, size, and line
 * breaks while you change it, so what you are editing is literally the page.
 *
 * Committing is on blur and on Enter, cancelling is on Escape, and a failed save
 * puts the old text back and says why. Paste is flattened to plain text; this
 * writes to a varchar, not a document.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type KeyboardEvent,
} from 'react';
import type { Binding } from './bindings';
import { useEditMode } from './mode';

type Props = {
  bind: Binding;
  /** The element to render. Defaults to a span so it inherits whatever wraps it. */
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
  /** Anything the host component needs to hang off the element (data-*, aria-*). */
  rest?: Record<string, unknown>;
};

type State = 'idle' | 'editing' | 'saving' | 'error';

/** contentEditable gives back rendered text; the column wants one line of it. */
const flatten = (text: string) => text.replace(/\s+/g, ' ').trim();

export function Editable({ bind, as, style, className, rest }: Props) {
  const Tag = (as ?? 'span') as ElementType;
  const editMode = useEditMode();
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  // Leaving edit mode mid-edit shouldn't strand a half-typed value on screen.
  useEffect(() => {
    if (!editMode && ref.current) ref.current.textContent = bind.value;
  }, [editMode, bind.value]);

  if (!editMode || !bind.editable) {
    return (
      <Tag style={style} className={className} {...rest}>
        {bind.value}
      </Tag>
    );
  }

  const commit = async () => {
    const el = ref.current;
    if (!el) return;
    const next = flatten(el.innerText);

    if (next === bind.value) {
      el.textContent = bind.value; // undo any whitespace the browser added
      setState('idle');
      return;
    }
    if (!next) {
      // Emptying a field is almost always a slip, and an empty heading is a
      // hole in the page. Refuse it here rather than after the round trip.
      el.textContent = bind.value;
      setState('error');
      setError('Cannot be empty');
      window.setTimeout(() => setState('idle'), 1800);
      return;
    }

    setState('saving');
    setError(null);
    try {
      await bind.save(next);
      setState('idle');
    } catch (err) {
      el.textContent = bind.value;
      setError((err as Error).message ?? 'Save failed');
      setState('error');
      window.setTimeout(() => setState('idle'), 4000);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (ref.current) ref.current.textContent = bind.value;
      ref.current?.blur();
      return;
    }
    // Enter means "done" everywhere: these are plain strings, and a line break
    // typed into one would not survive the round trip anyway.
    if (event.key === 'Enter') {
      event.preventDefault();
      ref.current?.blur();
    }
  };

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ ...style, cursor: 'text' }}
      contentEditable={state !== 'saving'}
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      tabIndex={0}
      aria-label={bind.label}
      title={error ?? `${bind.label} — click to edit`}
      data-editable
      data-editing={state === 'editing'}
      data-saving={state === 'saving'}
      data-failed={state === 'error'}
      onFocus={() => setState('editing')}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onPaste={(event: React.ClipboardEvent) => {
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, flatten(text));
      }}
      // The cards are anchors and the buttons are buttons; a click meant for the
      // caret must not also follow a link or fire an action.
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event: React.MouseEvent) => event.stopPropagation()}
      {...rest}
    >
      {bind.value}
    </Tag>
  );
}
