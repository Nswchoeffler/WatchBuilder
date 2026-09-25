import { useId, useRef, useState } from 'react';
import { Role, type PartType, type Visual } from '../../domain/schemas';
import { templatesFor, type ParamSpec } from '../../render/templateCatalog';
import { artRoles } from '../../render/uploaded/scaleCheck';
import { ColorField, FormSection, SelectField, useForm, getAt, options } from './form';

// The drawing half of the editor: either a template and the settings it reads, or uploaded SVG art
// (spec: docs/svg-canvas-spec.md). The art itself lives beside the draft rather than in it, because
// a part only holds an `assetId` — the markup is stored in the pack when the part is saved.

const NOT_DRAWN: Partial<Record<PartType, string>> = {
  movement: 'Movements sit under the dial, so they are never drawn. The template is kept for later.',
  crystal: 'Crystals are drawn from their shape and coating, so there are no settings here.',
};

/** What the file has to look like for each type, per spec §2. Units are always 1 = 1 mm. */
const UPLOAD_HINTS: Record<PartType, string> = {
  movement: '',
  case: 'Centred on the dial centre, 12:00 up, drawn without the crown.',
  dial: 'Centred on the dial centre, 12:00 up, with any windows where they sit on the finished watch.',
  hands: 'One file with <g id="hour">, <g id="minute">, <g id="seconds"> (and <g id="gmt">), each pointing at 12 from the pivot at 0,0.',
  chapterRing: 'Centred on the dial centre, 12:00 up.',
  bezel: 'Centred on the dial centre, 12:00 up.',
  bezelInsert: 'Centred on the dial centre, marker at 12.',
  crystal: 'Centred on the dial centre. Drawn over everything, so keep it mostly transparent.',
  crown: 'Origin at the centre of the stem exit on the case edge, with the stem pointing right (+x).',
  strap: '<g id="top"> extending up from its spring bar at 0,0, and optionally <g id="bottom"> extending down.',
};

const ROLE_LABELS: Record<Role, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  lume: 'Lume',
  metal: 'Metal',
};

export interface UploadProps {
  /** Sanitized markup for the draft, if a file has been uploaded. */
  art: string | undefined;
  onArt: (markup: string | undefined) => void;
  /** Spec §5 checks against the current measurements. */
  warnings: readonly string[];
  /** Restored when switching back from an upload to a template. */
  lastTemplate: Visual;
  onLeaveTemplate: (visual: Visual) => void;
}

export function VisualForm({ type, upload }: { type: PartType; upload: UploadProps }) {
  const form = useForm();
  const visual = getAt(form.value, 'visual') as Visual | undefined;
  const uploaded = visual?.kind === 'svg';
  const note = NOT_DRAWN[type];

  const useTemplate = () => form.set('visual', upload.lastTemplate);
  const useUpload = () => {
    if (visual?.kind === 'template') upload.onLeaveTemplate(visual);
    const id = getAt(form.value, 'id');
    // A placeholder until saving, which stores the art under the part's id.
    form.set('visual', { kind: 'svg', assetId: typeof id === 'string' && id ? id : 'upload' });
  };

  return (
    <>
      <FormSection title="Drawing">
        {type !== 'movement' && (
          <div className="field">
            <span className="field-label" id="drawing-source">Drawn from</span>
            <div className="segmented" role="group" aria-labelledby="drawing-source">
              <button type="button" aria-pressed={!uploaded} onClick={useTemplate} disabled={!uploaded}>
                Template
              </button>
              <button type="button" aria-pressed={uploaded} onClick={useUpload} disabled={uploaded}>
                Uploaded SVG
              </button>
            </div>
          </div>
        )}
        {uploaded ? <UploadField type={type} upload={upload} /> : <TemplateSelect type={type} hint={note} />}
      </FormSection>

      {uploaded ? <RoleColours art={upload.art} /> : <TemplateSettings type={type} />}
    </>
  );
}

// ── template ────────────────────────────────────────────────────────────────

function TemplateSelect({ type, hint }: { type: PartType; hint?: string }) {
  const templates = templatesFor(type);
  return (
    <SelectField
      path="visual.template"
      label="Template"
      choices={options(templates.map((t) => t.id), Object.fromEntries(templates.map((t) => [t.id, t.label])))}
      placeholder="Choose…"
      hint={hint}
    />
  );
}

function TemplateSettings({ type }: { type: PartType }) {
  const form = useForm();
  const current = String(getAt(form.value, 'visual.template') ?? '');
  const spec = templatesFor(type).find((t) => t.id === current);
  if (!spec || spec.params.length === 0) return null;
  return (
    <FormSection title="Settings">
      {spec.params.map((p) => (
        <ParamField key={p.key} spec={p} />
      ))}
    </FormSection>
  );
}

function ParamField({ spec }: { spec: ParamSpec }) {
  const path = `visual.params.${spec.key}`;
  switch (spec.kind) {
    case 'color':
      return <ColorField path={path} label={spec.label} hint={spec.hint} nullable={spec.nullable} fallback={spec.fallback} />;
    case 'choice':
      return <SelectField path={path} label={spec.label} choices={options(spec.choices)} placeholder={`Default (${spec.fallback})`} />;
    case 'lines':
      return <LinesField path={path} label={spec.label} hint={spec.hint} />;
  }
}

/** Dial text: one line per row, stored as an array of strings. */
function LinesField({ path, label, hint }: { path: string; label: string; hint?: string }) {
  const form = useForm();
  const value = getAt(form.value, path);
  const text = Array.isArray(value) ? value.join('\n') : '';
  const id = `lines-${path.replace(/\W/g, '-')}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className="input"
        rows={3}
        value={text}
        onChange={(e) => {
          const lines = e.target.value.split('\n').slice(0, 4);
          form.set(path, lines.some((l) => l.trim()) ? lines : undefined);
        }}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

// ── upload ──────────────────────────────────────────────────────────────────

function UploadField({ type, upload }: { type: PartType; upload: UploadProps }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<{ file: string; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const read = async (file: File) => {
    // Loaded on first upload: the sanitiser brings DOMPurify, which nothing else in the app needs.
    const { MAX_UPLOAD_BYTES, sanitizeSvg } = await import('../../domain/svg/sanitize');
    // Checked before reading, so a huge file is never pulled into memory.
    const errors =
      file.size > MAX_UPLOAD_BYTES
        ? [`File is ${Math.round(file.size / 1024)} KB; the limit is ${MAX_UPLOAD_BYTES / 1024} KB.`]
        : null;
    const result = errors ? { ok: false as const, errors } : sanitizeSvg(await file.text());
    if (result.ok) {
      setRejected(null);
      setFileName(file.name);
      upload.onArt(result.svg);
    } else {
      setRejected({ file: file.name, errors: result.errors });
    }
  };

  const size = upload.art ? new TextEncoder().encode(upload.art).length : 0;

  return (
    <div className={`field upload-field${rejected ? ' invalid' : ''}`}>
      <label htmlFor={id}>SVG file</label>
      <div className="upload-row">
        <input
          ref={input}
          id={id}
          className="input"
          type="file"
          accept=".svg,image/svg+xml"
          aria-describedby={rejected ? `${id}-error` : `${id}-hint`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Cleared so choosing the same file again (after fixing it) fires another change.
            e.target.value = '';
            if (file) void read(file);
          }}
        />
        {upload.art && (
          <button
            type="button"
            className="btn small"
            onClick={() => {
              setFileName(null);
              upload.onArt(undefined);
            }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="field-hint" id={`${id}-hint`}>
        {upload.art
          ? `Using ${fileName ?? 'the stored drawing'} (${Math.max(1, Math.round(size / 1024))} KB, cleaned).`
          : 'No file yet. Until there is one, the part is drawn with its type’s default template.'}{' '}
        {UPLOAD_HINTS[type]} 1 unit = 1 mm; the viewBox must be centred on 0,0.
      </p>
      {rejected && (
        <div className="field-error" id={`${id}-error`} role="alert">
          <p className="upload-rejected">{rejected.file} was not used:</p>
          <ul className="upload-reasons">
            {rejected.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {upload.art && upload.warnings.length > 0 && (
        <ul className="upload-warnings" aria-label="Drawing warnings">
          {upload.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Spec §3: role-tagged elements take these colours. Only roles the file actually uses are offered. */
function RoleColours({ art }: { art: string | undefined }) {
  if (!art) return null;
  const used = artRoles(art);
  const roles = Role.options.filter((r) => used.has(r));
  if (roles.length === 0) return null;
  return (
    <FormSection title="Colours">
      {roles.map((r) => (
        <ColorField
          key={r}
          path={`visual.colors.${r}`}
          label={ROLE_LABELS[r]}
          hint={`Recolours elements with data-role="${r}". Leave empty to keep the file’s own colour.`}
        />
      ))}
    </FormSection>
  );
}
