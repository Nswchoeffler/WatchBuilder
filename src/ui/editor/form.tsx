import { createContext, useContext, useId, useState, type ReactNode } from 'react';

// A small form kit over a plain object draft. Fields address the draft by path
// ("dialSeat.min", "holes.gmt"), which is also how Zod reports its issues, so an
// error lands on exactly the input that caused it.

export interface FormCtx {
  value: Record<string, unknown>;
  /** Zod messages keyed by path, e.g. `insert.innerDiameter`. */
  errors: ReadonlyMap<string, string[]>;
  set: (path: string, value: unknown) => void;
}

const Ctx = createContext<FormCtx | null>(null);

export function FormProvider({ ctx, children }: { ctx: FormCtx; children: ReactNode }) {
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useForm(): FormCtx {
  const form = useContext(Ctx);
  if (!form) throw new Error('form fields must be used inside <FormProvider>');
  return form;
}

// ── path access ─────────────────────────────────────────────────────────────

const segments = (path: string) => path.split('.').map((s) => (/^\d+$/.test(s) ? Number(s) : s));

export function getAt(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of segments(path)) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
}

/** Immutable set. `undefined` deletes the key; missing parents are created as objects/arrays. */
export function setAt<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = segments(path);
  if (head === undefined) return value as T;
  const isIndex = typeof head === 'number';
  const base: unknown = obj ?? (isIndex ? [] : {});
  if (isIndex && Array.isArray(base)) {
    const next = [...base];
    next[head] = rest.length ? setAt(next[head], rest.join('.'), value) : value;
    return next as T;
  }
  const record = { ...(base as Record<string, unknown>) };
  const key = String(head);
  if (rest.length) record[key] = setAt(record[key], rest.join('.'), value);
  else if (value === undefined) delete record[key];
  else record[key] = value;
  return record as T;
}

// ── field shell ─────────────────────────────────────────────────────────────

interface Common {
  path: string;
  label: string;
  hint?: string;
}

function useField(path: string) {
  const form = useForm();
  const id = useId();
  const errors = form.errors.get(path) ?? [];
  return {
    form,
    id,
    errors,
    value: getAt(form.value, path),
    set: (v: unknown) => form.set(path, v),
    describedBy: errors.length ? `${id}-error` : undefined,
    invalid: errors.length > 0,
  };
}

function Field({ id, label, hint, errors, children }: { id: string; label: string; hint?: string; errors: string[]; children: ReactNode }) {
  return (
    <div className={`field${errors.length ? ' invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !errors.length && <p className="field-hint">{hint}</p>}
      {errors.length > 0 && (
        <p className="field-error" id={`${id}-error`}>
          {errors.join('. ')}
        </p>
      )}
    </div>
  );
}

/** A row of fields that belong together (e.g. hour / minute / seconds). */
export const FieldRow = ({ label, children }: { label?: string; children: ReactNode }) => (
  <div className="field-row">
    {label && <span className="field-row-label">{label}</span>}
    <div className="field-row-items">{children}</div>
  </div>
);

/**
 * A fieldset, so repeated labels stay unambiguous: "Seconds" under "Hole sizes" and
 * "Seconds" under "Lengths" are announced with their group.
 */
export const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="form-section">
    <legend>{title}</legend>
    <div className="form-grid">{children}</div>
  </fieldset>
);

// ── text ────────────────────────────────────────────────────────────────────

export function TextField({ path, label, hint, maxLength, placeholder, optional }: Common & { maxLength?: number; placeholder?: string; optional?: boolean }) {
  const f = useField(path);
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <input
        id={f.id}
        className="input"
        type="text"
        maxLength={maxLength}
        placeholder={placeholder}
        value={typeof f.value === 'string' ? f.value : ''}
        aria-invalid={f.invalid || undefined}
        aria-describedby={f.describedBy}
        onChange={(e) => f.set(optional && !e.target.value ? undefined : e.target.value)}
      />
    </Field>
  );
}

export function TextAreaField({ path, label, hint, maxLength }: Common & { maxLength?: number }) {
  const f = useField(path);
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <textarea
        id={f.id}
        className="input"
        rows={3}
        maxLength={maxLength}
        value={typeof f.value === 'string' ? f.value : ''}
        aria-invalid={f.invalid || undefined}
        aria-describedby={f.describedBy}
        onChange={(e) => f.set(e.target.value || undefined)}
      />
    </Field>
  );
}

const toLines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

/**
 * A list of strings edited one per line; blank lines are ignored and an empty list clears
 * the field. Errors on any entry (`sources.2`) are shown here, numbered by line.
 */
export function LineListField({ path, label, hint, placeholder }: Common & { placeholder?: string }) {
  const f = useField(path);
  const list = Array.isArray(f.value) ? (f.value as unknown[]).map(String) : [];
  // The text is kept as typed, so a trailing newline survives until the next entry is typed.
  const [text, setText] = useState(() => list.join('\n'));
  if (toLines(text).join('\n') !== list.join('\n')) setText(list.join('\n'));

  const errors = [...f.form.errors].flatMap(([key, messages]) => {
    if (key === path) return messages;
    if (!key.startsWith(`${path}.`)) return [];
    const line = Number(key.slice(path.length + 1).split('.')[0]) + 1;
    return messages.map((m) => `Line ${line}: ${m}`);
  });
  const describedBy = errors.length ? `${f.id}-error` : undefined;

  return (
    <Field id={f.id} label={label} hint={hint} errors={errors}>
      <textarea
        id={f.id}
        className="input"
        rows={2}
        placeholder={placeholder}
        value={text}
        aria-invalid={errors.length > 0 || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          setText(e.target.value);
          const lines = toLines(e.target.value);
          f.set(lines.length ? lines : undefined);
        }}
      />
    </Field>
  );
}

// ── numbers ─────────────────────────────────────────────────────────────────

/**
 * Number input that keeps what you typed. Half-finished values ("28." while typing)
 * stay on screen; anything unparseable is handed to Zod as-is so the error is the schema's.
 */
function useNumberText(value: unknown) {
  const external = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
  const [text, setText] = useState(external);
  const [seen, setSeen] = useState(external);
  if (external !== seen) {
    setSeen(external);
    if (Number(text) !== value) setText(external);
  }
  return [text, setText] as const;
}

const parseNumber = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : trimmed;
};

export function NumberField({ path, label, hint, step = 0.01, min, unit }: Common & { step?: number; min?: number; unit?: string }) {
  const f = useField(path);
  const [text, setText] = useNumberText(f.value);
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <div className="input-unit">
        <input
          id={f.id}
          className="input"
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={text}
          aria-invalid={f.invalid || undefined}
          aria-describedby={f.describedBy}
          onChange={(e) => {
            setText(e.target.value);
            f.set(parseNumber(e.target.value));
          }}
        />
        {unit && <span aria-hidden="true">{unit}</span>}
      </div>
    </Field>
  );
}

/** Millimetres, the unit almost every measurement uses. */
export const MmField = (props: Common) => <NumberField {...props} step={0.01} min={0} unit="mm" />;

// ── choices ─────────────────────────────────────────────────────────────────

export interface Option {
  value: string;
  label: string;
}

export const options = (values: readonly string[], labels: Record<string, string> = {}): Option[] =>
  values.map((v) => ({ value: v, label: labels[v] ?? v }));

export function SelectField({ path, label, hint, choices, placeholder }: Common & { choices: readonly Option[]; placeholder?: string }) {
  const f = useField(path);
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <select
        id={f.id}
        className="input"
        value={typeof f.value === 'string' ? f.value : ''}
        aria-invalid={f.invalid || undefined}
        aria-describedby={f.describedBy}
        onChange={(e) => f.set(e.target.value || undefined)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {choices.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function BoolField({ path, label, hint }: Common) {
  const f = useField(path);
  return (
    <div className="field">
      <label className="switch">
        <input type="checkbox" checked={f.value === true} onChange={(e) => f.set(e.target.checked)} />
        {label}
      </label>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/** Checkbox set over a fixed list, stored as an array in draft order. */
export function MultiSelectField({ path, label, hint, choices }: Common & { choices: readonly Option[] }) {
  const f = useField(path);
  const current = Array.isArray(f.value) ? (f.value as unknown[]) : [];
  const toggle = (value: string, on: boolean) =>
    f.set(on ? [...current.filter((v) => v !== value), value] : current.filter((v) => v !== value));
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <div className="check-set" role="group" aria-label={label} id={f.id}>
        {choices.map((o) => (
          <label key={o.value} className="check">
            <input type="checkbox" checked={current.includes(o.value)} onChange={(e) => toggle(o.value, e.target.checked)} />
            {o.label}
          </label>
        ))}
      </div>
    </Field>
  );
}

// ── crown steps ─────────────────────────────────────────────────────────────

export const CROWN_STEP_CHOICES: Option[] = [
  { value: '0', label: '3:00' },
  { value: '2', label: '3.8' },
  { value: '3', label: '4.1' },
];

/** Crown position as date-disc steps (see docs/compatibility-spec.md). */
export function CrownStepsField({ path, label, hint }: Common) {
  const f = useField(path);
  return (
    <Field id={f.id} label={label} hint={hint ?? 'Where the crown sits: 3:00, 3.8 or 4.1.'} errors={f.errors}>
      <select
        id={f.id}
        className="input"
        value={typeof f.value === 'number' ? String(f.value) : ''}
        aria-invalid={f.invalid || undefined}
        aria-describedby={f.describedBy}
        onChange={(e) => f.set(e.target.value === '' ? undefined : Number(e.target.value))}
      >
        <option value="">Choose…</option>
        {CROWN_STEP_CHOICES.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

/** Several crown positions, for dials with more than one set of feet. */
export function CrownStepsSetField({ path, label, hint }: Common) {
  const f = useField(path);
  const current = Array.isArray(f.value) ? (f.value as unknown[]) : [];
  const toggle = (step: number, on: boolean) =>
    f.set(on ? [...current.filter((v) => v !== step), step].sort((a, b) => Number(a) - Number(b)) : current.filter((v) => v !== step));
  return (
    <Field id={f.id} label={label} hint={hint ?? 'Every crown position this part has feet for.'} errors={f.errors}>
      <div className="check-set" role="group" aria-label={label} id={f.id}>
        {CROWN_STEP_CHOICES.map((o) => (
          <label key={o.value} className="check">
            <input type="checkbox" checked={current.includes(Number(o.value))} onChange={(e) => toggle(Number(o.value), e.target.checked)} />
            {o.label}
          </label>
        ))}
      </div>
    </Field>
  );
}

// ── angles ──────────────────────────────────────────────────────────────────

const CLOCK_PRESETS: Option[] = [
  { value: '0', label: '12:00' },
  { value: '30', label: '1:00' },
  { value: '60', label: '2:00' },
  { value: '90', label: '3:00' },
  { value: '120', label: '4:00' },
  { value: '135', label: '4:30' },
  { value: '180', label: '6:00' },
  { value: '240', label: '8:00' },
  { value: '270', label: '9:00' },
  { value: '300', label: '10:00' },
];

/** Degrees clockwise from 12:00, entered by clock position or exact angle. */
export function AngleField({ path, label, hint }: Common) {
  const f = useField(path);
  const preset = CLOCK_PRESETS.find((p) => Number(p.value) === f.value);
  const [custom, setCustom] = useState(!preset);
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <div className="input-pair">
        <select
          className="input"
          aria-label={`${label} clock position`}
          value={custom ? 'custom' : (preset?.value ?? '')}
          onChange={(e) => {
            if (e.target.value === 'custom') return setCustom(true);
            setCustom(false);
            f.set(Number(e.target.value));
          }}
        >
          {!preset && !custom && <option value="">Choose…</option>}
          {CLOCK_PRESETS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        {custom && (
          <div className="input-unit">
            <input
              id={f.id}
              className="input"
              type="number"
              step={0.1}
              min={0}
              max={359.9}
              value={typeof f.value === 'number' ? f.value : ''}
              aria-label={`${label} in degrees`}
              aria-invalid={f.invalid || undefined}
              aria-describedby={f.describedBy}
              onChange={(e) => f.set(parseNumber(e.target.value))}
            />
            <span aria-hidden="true">°</span>
          </div>
        )}
      </div>
    </Field>
  );
}

// ── slugs with suggestions ──────────────────────────────────────────────────

/**
 * A profile/seat/tube id. These only have to match between parts, so the field
 * offers the values already in the catalog and lets you name a new one.
 */
export function SlugField({ path, label, hint, suggestions }: Common & { suggestions: readonly string[] }) {
  const f = useField(path);
  const current = typeof f.value === 'string' ? f.value : '';
  const known = suggestions.includes(current);
  const [free, setFree] = useState(!known && current !== '');
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <div className="input-pair">
        <select
          className="input"
          aria-label={`${label} (existing)`}
          value={free ? 'new' : current}
          onChange={(e) => {
            if (e.target.value === 'new') {
              setFree(true);
              // Start from empty rather than the id that was chosen before.
              f.set(undefined);
              return;
            }
            setFree(false);
            f.set(e.target.value || undefined);
          }}
        >
          <option value="">Choose…</option>
          {suggestions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="new">New…</option>
        </select>
        {free && (
          <input
            id={f.id}
            className="input"
            type="text"
            placeholder="new-profile-id"
            aria-label={`${label} (new id)`}
            aria-invalid={f.invalid || undefined}
            aria-describedby={f.describedBy}
            value={current}
            onChange={(e) => f.set(e.target.value || undefined)}
          />
        )}
      </div>
    </Field>
  );
}

// ── colours ─────────────────────────────────────────────────────────────────

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ColorField({ path, label, hint, nullable, fallback = '#c9ccd1' }: Common & { nullable?: boolean; fallback?: string }) {
  const f = useField(path);
  const current = typeof f.value === 'string' ? f.value : '';
  const off = nullable && f.value === null;
  return (
    <Field id={f.id} label={label} hint={hint} errors={f.errors}>
      <div className="input-pair color-pair">
        <input
          type="color"
          className="color-swatch"
          aria-label={`${label} colour`}
          value={HEX.test(current) ? current : fallback}
          disabled={off}
          onChange={(e) => f.set(e.target.value)}
        />
        <input
          id={f.id}
          className="input mono"
          type="text"
          placeholder="#rrggbb"
          maxLength={7}
          value={off ? '' : current}
          disabled={off}
          aria-invalid={f.invalid || undefined}
          aria-describedby={f.describedBy}
          onChange={(e) => f.set(e.target.value || undefined)}
        />
        {nullable && (
          <label className="check">
            <input type="checkbox" checked={!off} onChange={(e) => f.set(e.target.checked ? fallback : null)} />
            On
          </label>
        )}
      </div>
    </Field>
  );
}

// ── optional groups ─────────────────────────────────────────────────────────

/**
 * A feature that can be absent (a date window, a magnifier, a bezel insert).
 * Off stores `null`; on restores `whenOn` and reveals the fields.
 */
export function NullableGroup({ path, label, hint, whenOn, children }: Common & { whenOn: unknown; children: ReactNode }) {
  const f = useField(path);
  const on = f.value !== null && f.value !== undefined;
  return (
    <div className={`nullable${on ? ' on' : ''}`}>
      <div className="nullable-head">
        <label className="switch">
          <input type="checkbox" checked={on} onChange={(e) => f.set(e.target.checked ? structuredClone(whenOn) : null)} />
          {label}
        </label>
        {f.errors.length > 0 && <p className="field-error">{f.errors.join('. ')}</p>}
      </div>
      {hint && <p className="field-hint">{hint}</p>}
      {on && <div className="form-grid">{children}</div>}
    </div>
  );
}
