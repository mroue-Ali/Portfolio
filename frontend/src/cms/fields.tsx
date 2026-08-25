/**
 * Form controls, and the spec that stamps them out.
 *
 * Every editor in the CMS is the same shape — a row of the database rendered as
 * labelled inputs — so each page declares a `FieldSpec[]` and `<Fields>` builds
 * the form. Adding a column to a table is then a line of config here, not a new
 * component; and every form gets the same spacing, hints, and list editing for
 * free.
 */

import { useId, type CSSProperties, type ReactNode } from 'react';
import { ImageField } from './ImageField';
import { IconButton } from './ui';
import { cms, mono } from './tokens';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'toggle'
  | 'list'
  | 'color'
  | 'select'
  | 'password'
  | 'image';

export type FieldSpec = {
  /** Column name — also the key into the draft record. */
  name: string;
  label: string;
  type?: FieldType;
  /** Sits under the control, for the things a label can't say. */
  hint?: string;
  placeholder?: string;
  rows?: number;
  options?: readonly { value: string; label: string }[];
  /** Wide fields take the whole row; the rest pair up. */
  span?: 1 | 2;
  /** Placeholder for a new entry in a list field. */
  itemPlaceholder?: string;
};

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} style={{ ...mono, color: cms.muted, fontSize: 10 }}>
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  span = 1,
}: {
  label?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        gridColumn: span === 2 ? '1 / -1' : undefined,
        minWidth: 0,
      }}
    >
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && (
        <span style={{ color: cms.muted, fontSize: 12, lineHeight: 1.5 }}>{hint}</span>
      )}
    </div>
  );
}

export function FieldGrid({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: 0,
        border: 0,
        background: 'none',
        color: 'inherit',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      <span
        style={{
          position: 'relative',
          width: 38,
          height: 21,
          flex: 'none',
          borderRadius: 999,
          border: `1px solid ${checked ? 'transparent' : cms.border}`,
          background: checked ? `linear-gradient(135deg, ${cms.violet}, ${cms.cyan})` : cms.bg,
          transition: 'background 0.18s, border-color 0.18s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 19 : 2,
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: checked ? '#10131A' : cms.muted,
            transition: 'left 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </span>
      <span style={{ fontSize: 13, color: checked ? cms.text : cms.muted }}>{label}</span>
    </button>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const valid = /^#[0-9a-fA-F]{3,8}$/.test(value);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input
        type="color"
        value={valid ? value : '#E9ECF0'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-label="Pick a colour"
        style={{
          width: 42,
          height: 38,
          flex: 'none',
          padding: 2,
          border: `1px solid ${cms.border}`,
          borderRadius: 4,
          background: cms.bg,
          cursor: 'pointer',
        }}
      />
      <input
        className="cms-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#7B68FA"
        spellCheck={false}
      />
    </div>
  );
}

/**
 * A JSON string column, edited as what it is: a list.
 *
 * Enter adds the next entry and keeps focus moving down the list, which is how
 * you actually type five bullet points. Blank entries are dropped on save by
 * `cleanList` rather than nagging as you type.
 */
export function ListInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const items = value ?? [];

  const replace = (index: number, text: string) =>
    onChange(items.map((item, i) => (i === index ? text : item)));

  const insertAfter = (index: number) => {
    const next = [...items];
    next.splice(index + 1, 0, '');
    onChange(next);
    // The new input doesn't exist until React commits.
    queueMicrotask(() => {
      const container = document.activeElement?.closest('[data-list-input]');
      const inputs = container?.querySelectorAll<HTMLElement>('input, textarea');
      inputs?.[index + 1]?.focus();
    });
  };

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div data-list-input style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span
            aria-hidden="true"
            style={{
              ...mono,
              color: cms.muted,
              paddingTop: 12,
              fontSize: 10,
              width: 18,
              flex: 'none',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          {multiline ? (
            <textarea
              className="cms-textarea"
              value={item}
              rows={rows}
              placeholder={placeholder}
              onChange={(e) => replace(index, e.target.value)}
            />
          ) : (
            <input
              className="cms-input"
              value={item}
              placeholder={placeholder}
              onChange={(e) => replace(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  insertAfter(index);
                }
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 2, paddingTop: 5 }}>
            <IconButton
              label="Move up"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <Arrow direction="up" />
            </IconButton>
            <IconButton
              label="Move down"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              <Arrow direction="down" />
            </IconButton>
            <IconButton
              label="Remove"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Cross />
            </IconButton>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="cms-btn"
        data-size="sm"
        data-variant="ghost"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange([...items, ''])}
      >
        + Add
      </button>
    </div>
  );
}

export function Arrow({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: direction === 'up' ? 'rotate(180deg)' : undefined }}
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

export function Cross() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

type Draft = Record<string, unknown>;

/** One control, chosen by `spec.type`. */
export function FieldControl({
  spec,
  value,
  onChange,
  id,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (next: unknown) => void;
  id: string;
}) {
  switch (spec.type) {
    case 'textarea':
      return (
        <textarea
          id={id}
          className="cms-textarea"
          rows={spec.rows ?? 4}
          value={(value as string) ?? ''}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <input
          id={id}
          className="cms-input"
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
    case 'toggle':
      return (
        <Toggle
          checked={Boolean(value)}
          onChange={onChange}
          label={value ? 'On' : 'Off'}
        />
      );
    case 'list':
      return (
        <ListInput
          value={(value as string[]) ?? []}
          onChange={onChange}
          placeholder={spec.itemPlaceholder}
          multiline={spec.rows ? spec.rows > 1 : false}
          rows={spec.rows}
        />
      );
    case 'color':
      return <ColorInput value={(value as string) ?? ''} onChange={onChange} />;
    case 'image':
      return <ImageField value={(value as string) ?? ''} onChange={onChange} hint={spec.hint} />;
    case 'select':
      return (
        <select
          id={id}
          className="cms-select"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {spec.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'password':
      return (
        <input
          id={id}
          className="cms-input"
          type="password"
          autoComplete="new-password"
          value={(value as string) ?? ''}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          id={id}
          className="cms-input"
          value={(value as string) ?? ''}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function SpecField({
  spec,
  draft,
  onChange,
}: {
  spec: FieldSpec;
  draft: Draft;
  onChange: (name: string, value: unknown) => void;
}) {
  const id = useId();
  // A list needs the width; a toggle labels itself.
  const wide = spec.type === 'list' || spec.type === 'textarea' || spec.type === 'image';
  const span = spec.span ?? (wide ? 2 : 1);

  return (
    <Field
      label={spec.label}
      // The image control renders its own hint, under the preview it explains.
      hint={spec.type === 'image' ? undefined : spec.hint}
      htmlFor={id}
      span={span}
    >
      <FieldControl
        spec={spec}
        id={id}
        value={draft[spec.name]}
        onChange={(next) => onChange(spec.name, next)}
      />
    </Field>
  );
}

/** Renders a whole spec against a draft record. */
export function Fields({
  specs,
  draft,
  onChange,
}: {
  specs: readonly FieldSpec[];
  draft: Draft;
  onChange: (name: string, value: unknown) => void;
}) {
  return (
    <FieldGrid>
      {specs.map((spec) => (
        <SpecField key={spec.name} spec={spec} draft={draft} onChange={onChange} />
      ))}
    </FieldGrid>
  );
}
