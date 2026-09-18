import type { PartType } from '../../domain/schemas';
import { templatesFor, type ParamSpec } from '../../render/templateCatalog';
import { ColorField, FormSection, SelectField, useForm, getAt, options } from './form';

// The drawing half of the editor: which template draws the part, and the settings it reads.
// Uploaded SVG art arrives in Phase 5.2; until then every part is drawn from a template.

const NOT_DRAWN: Partial<Record<PartType, string>> = {
  movement: 'Movements sit under the dial, so they are never drawn. The template is kept for later.',
  crystal: 'Crystals are drawn from their shape and coating, so there are no settings here.',
};

export function VisualForm({ type }: { type: PartType }) {
  const form = useForm();
  const templates = templatesFor(type);
  const current = String(getAt(form.value, 'visual.template') ?? '');
  const spec = templates.find((t) => t.id === current);
  const note = NOT_DRAWN[type];

  return (
    <>
      <FormSection title="Drawing">
        <SelectField
          path="visual.template"
          label="Template"
          choices={options(templates.map((t) => t.id), Object.fromEntries(templates.map((t) => [t.id, t.label])))}
          placeholder="Choose…"
          hint={note}
        />
      </FormSection>

      {spec && spec.params.length > 0 && (
        <FormSection title="Settings">
          {spec.params.map((p) => (
            <ParamField key={p.key} spec={p} />
          ))}
        </FormSection>
      )}
    </>
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
