import { describe, expect, it } from 'vitest';
import { newBuild } from '../../data/builds';
import { draftReducer, initDraft, type DraftAction, type DraftState } from './draft';

const ref = (partId: string) => ({ packId: 'core', partId });
const run = (state: DraftState, ...actions: DraftAction[]) => actions.reduce(draftReducer, state);

describe('build draft history', () => {
  const start = initDraft(newBuild('Test'));

  it('undoes and redoes slot and flag changes', () => {
    const s = run(
      start,
      { type: 'set-slot', slot: 'case', ref: ref('cs-sub40') },
      { type: 'set-slot', slot: 'dial', ref: ref('dl-sub-black') },
      { type: 'toggle-flag', flag: 'dial-dots' },
    );
    expect(s.build.flags).toEqual(['dial-dots']);

    const undone = run(s, { type: 'undo' }, { type: 'undo' });
    expect(undone.build.flags).toEqual([]);
    expect(undone.build.slots).toEqual({ case: ref('cs-sub40') });

    const redone = run(undone, { type: 'redo' });
    expect(redone.build.slots.dial).toEqual(ref('dl-sub-black'));
    expect(redone.future).toHaveLength(1);
  });

  it('clears the redo stack on a new change', () => {
    const s = run(start, { type: 'set-slot', slot: 'case', ref: ref('cs-sub40') }, { type: 'undo' }, { type: 'set-slot', slot: 'case', ref: ref('cs-fluted36') });
    expect(s.future).toEqual([]);
    expect(run(s, { type: 'redo' })).toBe(s);
  });

  it('clearing a slot removes the key', () => {
    const s = run(start, { type: 'set-slot', slot: 'case', ref: ref('cs-sub40') }, { type: 'set-slot', slot: 'case', ref: undefined });
    expect('case' in s.build.slots).toBe(false);
  });

  it('ignores no-op changes, and keeps renames out of history', () => {
    const s = run(start, { type: 'set-slot', slot: 'case', ref: ref('cs-sub40') });
    expect(run(s, { type: 'set-slot', slot: 'case', ref: ref('cs-sub40') })).toBe(s);
    const renamed = run(s, { type: 'rename', name: '  Diver  ' });
    expect(renamed.build.name).toBe('Diver');
    expect(renamed.past).toHaveLength(1);
    expect(renamed.revision).toBe(s.revision + 1);
    expect(run(renamed, { type: 'rename', name: '   ' })).toBe(renamed);
  });

  it('bumps the revision on every saved change', () => {
    const s = run(start, { type: 'set-slot', slot: 'case', ref: ref('cs-sub40') }, { type: 'undo' }, { type: 'redo' });
    expect(s.revision).toBe(3);
  });
});
