import type { PartType } from '../../domain/schemas';
import {
  AngleField,
  BoolField,
  ColorField,
  CrownStepsField,
  CrownStepsSetField,
  FieldRow,
  FormSection,
  LineListField,
  MmField,
  MultiSelectField,
  NullableGroup,
  NumberField,
  options,
  SelectField,
  SlugField,
  TextAreaField,
  TextField,
  useForm,
} from './form';
import type { Suggestions } from './suggestions';

// Measurement forms, one per part type. Every field addresses the draft by the same
// path Zod reports issues on, so validation messages land inline without any mapping.

const MOUNT_LABELS = { 'seiko-nh': 'Seiko NH', 'miyota-26': 'Miyota 26mm', 'eta-25.6': 'ETA 25.6mm', 'seiko-vh': 'Seiko VH' };
const MOUNTS = options(['seiko-nh', 'miyota-26', 'eta-25.6', 'seiko-vh'], MOUNT_LABELS);

const FEET = options(['seiko-nh', 'miyota-82', 'miyota-90', 'eta-2824', 'sellita-sw200', 'seiko-vh', 'none'], {
  'seiko-nh': 'Seiko NH',
  'miyota-82': 'Miyota 82xx',
  'miyota-90': 'Miyota 90xx',
  'eta-2824': 'ETA 2824',
  'sellita-sw200': 'Sellita SW200',
  'seiko-vh': 'Seiko VH',
  none: 'No feet (dial dots)',
});

const AT_3 = { angle: 90 };

export const CONFIDENCE_CHOICES = options(['verified', 'community', 'unverified'], {
  verified: 'Verified — measured or from a spec sheet',
  community: 'Community — widely reported',
  unverified: 'Unverified — best guess',
});

/** Name, id, confidence and notes: the fields every part type shares. */
export function IdentityFields() {
  return (
    <FormSection title="Identity">
      <TextField path="name" label="Name" maxLength={80} hint="A generic style name, not a trademark." />
      <TextField path="id" label="Id" maxLength={64} hint="Lowercase letters, digits and dashes. Used to reference this part." />
      <SelectField path="confidence" label="Confidence" choices={CONFIDENCE_CHOICES} placeholder="Choose…" />
      <TextField path="inspiredBy" label="Inspired by" maxLength={120} optional hint="The real part this is modelled on, for your own reference." />
      <TextAreaField path="notes" label="Notes" maxLength={2000} hint="How the measurements were taken — calipers, a spec sheet, copied from another part." />
      <LineListField
        path="sources"
        label="Sources"
        placeholder="https://…"
        hint="Links to spec sheets or listings the measurements came from, one per line (up to 10)."
      />
    </FormSection>
  );
}

export function PartForm({ type, suggestions }: { type: PartType; suggestions: Suggestions }) {
  switch (type) {
    case 'movement':
      return <MovementForm />;
    case 'case':
      return <CaseForm suggestions={suggestions} />;
    case 'dial':
      return <DialForm />;
    case 'hands':
      return <HandsForm />;
    case 'chapterRing':
      return <ChapterRingForm />;
    case 'bezel':
      return <BezelForm suggestions={suggestions} />;
    case 'bezelInsert':
      return <BezelInsertForm />;
    case 'crystal':
      return <CrystalForm />;
    case 'crown':
      return <CrownForm suggestions={suggestions} />;
    case 'strap':
      return <StrapForm suggestions={suggestions} />;
  }
}

// ── movement ────────────────────────────────────────────────────────────────

function MovementForm() {
  return (
    <>
      <FormSection title="Movement">
        <TextField path="maker" label="Maker" maxLength={80} />
        <TextField path="caliber" label="Caliber" maxLength={80} />
        <SelectField path="kind" label="Kind" choices={options(['mechanical', 'quartz'])} placeholder="Choose…" />
        <SelectField path="mountSystem" label="Mount system" choices={MOUNTS} placeholder="Choose…" hint="Which casing ring or holder the movement needs." />
        <SelectField path="feetSystem" label="Dial feet system" choices={FEET} placeholder="Choose…" />
      </FormSection>

      <FormSection title="Measurements">
        <MmField path="diameter" label="Diameter" />
        <MmField path="casingDiameter" label="Casing diameter" hint="With the casing ring fitted. Optional." />
        <MmField path="height" label="Height" hint="Without hands." />
        <MmField path="heightWithHands" label="Height with hands" hint="Checked against the case's movement stack." />
        <MmField path="minDialCenterHole" label="Min dial centre hole" />
      </FormSection>

      <FormSection title="Hand posts">
        <FieldRow>
          <MmField path="handPosts.hour" label="Hour" />
          <MmField path="handPosts.minute" label="Minute" />
          <MmField path="handPosts.seconds" label="Seconds" />
          <MmField path="handPosts.gmt" label="GMT" />
        </FieldRow>
      </FormSection>

      <FormSection title="Complications">
        <NullableGroup path="date" label="Date" whenOn={AT_3} hint="Where the date shows with the crown at 3:00.">
          <AngleField path="date.angle" label="Date angle" />
        </NullableGroup>
        <NullableGroup path="day" label="Day wheel" whenOn={{ angle: 90, crownSteps: 0 }}>
          <AngleField path="day.angle" label="Day angle" />
          <CrownStepsField path="day.crownSteps" label="Indexed for crown" hint="The crown position this day wheel was made for." />
        </NullableGroup>
        <NullableGroup path="openHeart" label="Open heart" whenOn={{ angle: 270 }}>
          <AngleField path="openHeart.angle" label="Balance aperture angle" />
        </NullableGroup>
      </FormSection>
    </>
  );
}

// ── case ────────────────────────────────────────────────────────────────────

function CaseForm({ suggestions }: { suggestions: Suggestions }) {
  return (
    <>
      <FormSection title="Case">
        <SlugField path="style" label="Style" suggestions={suggestions.caseStyle} hint="Drives which case drawing is used." />
        <MmField path="diameter" label="Diameter" />
        <MmField path="lugToLug" label="Lug to lug" />
        <MmField path="thickness" label="Thickness" />
        <CrownStepsField path="crownSteps" label="Crown position" />
        <SlugField path="crownTube" label="Crown tube" suggestions={suggestions.crownTube} hint="Crowns with the same tube id fit." />
      </FormSection>

      <LugFitting suggestions={suggestions} />

      <FormSection title="Movement">
        <MultiSelectField path="movementMounts" label="Fits mounts" choices={MOUNTS} hint="Movement mount systems that drop straight in." />
        <MultiSelectField path="spacerMounts" label="Fits with a spacer" choices={MOUNTS} hint="Only with a spacer ring — flagged as a modification." />
        <MmField path="maxMovementStack" label="Max movement stack" hint="Movement height with hands that still clears the crystal." />
      </FormSection>

      <FormSection title="Seats">
        <FieldRow label="Dial seat">
          <MmField path="dialSeat.min" label="Min" />
          <MmField path="dialSeat.max" label="Max" />
        </FieldRow>
        <MmField path="crystalSeat" label="Crystal seat" />
        <SlugField path="bezelSeat" label="Bezel seat" suggestions={suggestions.bezelSeat} hint='Use "integral" when the bezel is part of the case.' />
        <ChapterRingSeat />
      </FormSection>
    </>
  );
}

/** Lug width and integrated bracelets are mutually exclusive, so one control sets both. */
function LugFitting({ suggestions }: { suggestions: Suggestions }) {
  const form = useForm();
  const integrated = form.value.integratedProfile !== undefined;
  const setIntegrated = (on: boolean) => {
    if (on) {
      form.set('lugWidth', null);
      form.set('integratedProfile', suggestions.integratedProfile[0] ?? 'integrated');
    } else {
      form.set('integratedProfile', undefined);
      form.set('lugWidth', 20);
    }
  };
  return (
    <FormSection title="Strap fitting">
      <div className="field">
        <label className="switch">
          <input type="checkbox" checked={integrated} onChange={(e) => setIntegrated(e.target.checked)} />
          Integrated bracelet
        </label>
        <p className="field-hint">The bracelet is shaped to the case instead of sitting on spring bars.</p>
      </div>
      {integrated ? (
        <SlugField path="integratedProfile" label="Integrated profile" suggestions={suggestions.integratedProfile} hint="Only bracelets with the same profile fit." />
      ) : (
        <>
          <MmField path="lugWidth" label="Lug width" />
          <SlugField path="endLinkProfile" label="End link profile" suggestions={suggestions.endLinkProfile} hint="For fitted end links. Leave unset for a plain strap fit." />
        </>
      )}
    </FormSection>
  );
}

/** The chapter ring seat diameter only exists when a ring is optional or required. */
function ChapterRingSeat() {
  const form = useForm();
  const requirement = (form.value.chapterRing as { requirement?: string } | undefined)?.requirement ?? 'none';
  return (
    <>
      <SelectField
        path="chapterRing.requirement"
        label="Chapter ring"
        choices={options(['none', 'optional', 'required'], { none: 'Not used', optional: 'Optional', required: 'Required' })}
        placeholder="Choose…"
      />
      {requirement !== 'none' && <MmField path="chapterRing.seatDiameter" label="Chapter ring seat" />}
    </>
  );
}

// ── dial ────────────────────────────────────────────────────────────────────

function DialForm() {
  return (
    <>
      <FormSection title="Dial">
        <MmField path="diameter" label="Diameter" />
        <MmField path="centerHole" label="Centre hole" hint="Must clear the movement's hand posts." />
        <SelectField path="feetSystem" label="Feet system" choices={FEET} placeholder="Choose…" />
        <CrownStepsSetField path="crownSteps" label="Feet for crown positions" />
        <BoolField path="gmtScale" label="24-hour GMT scale" />
      </FormSection>

      <FormSection title="Windows">
        <NullableGroup path="dateWindow" label="Date window" whenOn={AT_3}>
          <AngleField path="dateWindow.angle" label="Date angle" />
        </NullableGroup>
        <NullableGroup path="dayWindow" label="Day window" whenOn={AT_3}>
          <AngleField path="dayWindow.angle" label="Day angle" />
        </NullableGroup>
        <NullableGroup path="openHeartAperture" label="Open heart aperture" whenOn={{ angle: 270 }}>
          <AngleField path="openHeartAperture.angle" label="Aperture angle" />
        </NullableGroup>
      </FormSection>
    </>
  );
}

// ── hands ───────────────────────────────────────────────────────────────────

/**
 * Holes and lengths share a shape, and the schema requires the seconds and GMT
 * entries to agree between them, so both are driven from one pair of toggles.
 */
function HandsForm() {
  const form = useForm();
  const holes = (form.value.holes ?? {}) as Record<string, unknown>;
  const hasSeconds = holes.seconds !== null && holes.seconds !== undefined;
  const hasGmt = holes.gmt !== undefined;

  const setSeconds = (on: boolean) => {
    form.set('holes.seconds', on ? 0.2 : null);
    form.set('lengths.seconds', on ? 13 : null);
  };
  const setGmt = (on: boolean) => {
    form.set('holes.gmt', on ? 2.2 : undefined);
    form.set('lengths.gmt', on ? 12.5 : undefined);
  };

  return (
    <>
      <FormSection title="Hands">
        <div className="field">
          <label className="switch">
            <input type="checkbox" checked={hasSeconds} onChange={(e) => setSeconds(e.target.checked)} />
            Seconds hand
          </label>
        </div>
        <div className="field">
          <label className="switch">
            <input type="checkbox" checked={hasGmt} onChange={(e) => setGmt(e.target.checked)} />
            GMT hand
          </label>
        </div>
      </FormSection>

      <FormSection title="Hole sizes">
        <FieldRow>
          <MmField path="holes.hour" label="Hour" />
          <MmField path="holes.minute" label="Minute" />
          {hasSeconds && <MmField path="holes.seconds" label="Seconds" />}
          {hasGmt && <MmField path="holes.gmt" label="GMT" />}
        </FieldRow>
      </FormSection>

      <FormSection title="Lengths">
        <FieldRow>
          <MmField path="lengths.hour" label="Hour" />
          <MmField path="lengths.minute" label="Minute" />
          {hasSeconds && <MmField path="lengths.seconds" label="Seconds" />}
          {hasGmt && <MmField path="lengths.gmt" label="GMT" />}
        </FieldRow>
      </FormSection>
    </>
  );
}

// ── rings, bezels, crystal, crown ───────────────────────────────────────────

function ChapterRingForm() {
  return (
    <FormSection title="Chapter ring">
      <MmField path="outerDiameter" label="Outer diameter" />
      <MmField path="innerDiameter" label="Inner diameter" />
      <MmField path="height" label="Height" />
    </FormSection>
  );
}

const INSERT_PROFILES = options(['flat', 'sloped']);

function BezelForm({ suggestions }: { suggestions: Suggestions }) {
  return (
    <>
      <FormSection title="Bezel">
        <SlugField path="seat" label="Seat" suggestions={suggestions.bezelSeat.filter((s) => s !== 'integral')} hint="Must match the case's bezel seat." />
        <SelectField path="action" label="Action" choices={options(['unidirectional', 'bidirectional', 'fixed'])} placeholder="Choose…" />
      </FormSection>

      <FormSection title="Insert seat">
        <NullableGroup
          path="insert"
          label="Takes an insert"
          whenOn={{ outerDiameter: 38, innerDiameter: 30.6, profile: 'sloped' }}
          hint="Off for a solid bezel with no separate insert."
        >
          <MmField path="insert.outerDiameter" label="Outer diameter" />
          <MmField path="insert.innerDiameter" label="Inner diameter" />
          <SelectField path="insert.profile" label="Profile" choices={INSERT_PROFILES} placeholder="Choose…" />
        </NullableGroup>
      </FormSection>
    </>
  );
}

function BezelInsertForm() {
  return (
    <FormSection title="Bezel insert">
      <MmField path="outerDiameter" label="Outer diameter" />
      <MmField path="innerDiameter" label="Inner diameter" />
      <SelectField path="profile" label="Profile" choices={INSERT_PROFILES} placeholder="Choose…" hint="Must match the bezel's insert seat." />
      <SelectField
        path="scale"
        label="Scale"
        choices={options(['dive-60', 'gmt-24', 'tachymeter', 'countdown', 'compass', 'plain'], {
          'dive-60': '60-minute dive',
          'gmt-24': '24-hour GMT',
        })}
        placeholder="Choose…"
      />
    </FormSection>
  );
}

function CrystalForm() {
  return (
    <>
      <FormSection title="Crystal">
        <MmField path="diameter" label="Diameter" />
        <MmField path="thickness" label="Thickness" />
        <SelectField
          path="shape"
          label="Shape"
          choices={options(['flat', 'single-dome', 'double-dome', 'box'], { 'single-dome': 'Single dome', 'double-dome': 'Double dome' })}
          placeholder="Choose…"
        />
        <SelectField path="arCoating" label="AR coating" choices={options(['none', 'clear', 'blue', 'purple'])} placeholder="Choose…" />
      </FormSection>

      <FormSection title="Magnifier">
        <NullableGroup path="magnifier" label="Date magnifier" whenOn={AT_3} hint="Should sit over the dial's date window.">
          <AngleField path="magnifier.angle" label="Magnifier angle" />
        </NullableGroup>
      </FormSection>
    </>
  );
}

function CrownForm({ suggestions }: { suggestions: Suggestions }) {
  return (
    <FormSection title="Crown">
      <SlugField path="tube" label="Tube" suggestions={suggestions.crownTube} hint="Must match the case's crown tube." />
      <MmField path="diameter" label="Diameter" />
      <BoolField path="signed" label="Signed" hint="Has a logo on the crown face." />
    </FormSection>
  );
}

// ── strap ───────────────────────────────────────────────────────────────────

const STRAP_KINDS = options(['oyster', 'jubilee', 'president', 'mesh', 'nato', 'rubber', 'tropic', 'leather', 'integrated']);

/** An integrated bracelet has a profile and no width; every other kind is the other way round. */
function StrapForm({ suggestions }: { suggestions: Suggestions }) {
  const form = useForm();
  const kind = form.value.kind;
  const integrated = kind === 'integrated';

  const setKind = (next: string) => {
    form.set('kind', next);
    if (next === 'integrated') {
      form.set('width', null);
      form.set('integratedProfile', suggestions.integratedProfile[0] ?? 'integrated');
    } else {
      form.set('integratedProfile', undefined);
      if (form.value.width === null || form.value.width === undefined) form.set('width', 20);
    }
  };

  return (
    <>
      <FormSection title="Strap">
        <div className="field">
          <label htmlFor="strap-kind">Kind</label>
          <select id="strap-kind" className="input" value={typeof kind === 'string' ? kind : ''} onChange={(e) => setKind(e.target.value)}>
            <option value="">Choose…</option>
            {STRAP_KINDS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {integrated ? (
          <SlugField path="integratedProfile" label="Integrated profile" suggestions={suggestions.integratedProfile} hint="Must match the case's integrated profile." />
        ) : (
          <>
            <MmField path="width" label="Width" hint="At the lugs." />
            <SlugField path="endLinkProfile" label="End link profile" suggestions={suggestions.endLinkProfile} hint="For fitted end links. Leave unset for a plain strap." />
          </>
        )}
        <ColorField path="color" label="Colour" hint="Used when the drawing has no colour of its own." />
      </FormSection>
    </>
  );
}

export { NumberField };
