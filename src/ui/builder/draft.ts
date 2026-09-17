import type { Build, ModFlag, PartRef, Slot } from '../../domain/schemas';

/** The undoable part of a build. Renames are not part of history. */
type Snapshot = Pick<Build, 'slots' | 'flags'>;

export interface DraftState {
  build: Build;
  past: Snapshot[];
  future: Snapshot[];
  /** Increments on every change that should be saved. */
  revision: number;
}

export type DraftAction =
  | { type: 'set-slot'; slot: Slot; ref: PartRef | undefined }
  | { type: 'toggle-flag'; flag: ModFlag }
  | { type: 'rename'; name: string }
  | { type: 'undo' }
  | { type: 'redo' };

const HISTORY_LIMIT = 100;

export const initDraft = (build: Build): DraftState => ({ build, past: [], future: [], revision: 0 });

const snapshot = (b: Build): Snapshot => ({ slots: b.slots, flags: b.flags });

function commit(state: DraftState, next: Snapshot): DraftState {
  return {
    build: { ...state.build, ...next },
    past: [...state.past, snapshot(state.build)].slice(-HISTORY_LIMIT),
    future: [],
    revision: state.revision + 1,
  };
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'set-slot': {
      const current = state.build.slots[action.slot];
      if (current?.packId === action.ref?.packId && current?.partId === action.ref?.partId) return state;
      const slots = { ...state.build.slots };
      if (action.ref) slots[action.slot] = action.ref;
      else delete slots[action.slot];
      return commit(state, { slots, flags: state.build.flags });
    }
    case 'toggle-flag': {
      const on = state.build.flags.includes(action.flag);
      const flags = on ? state.build.flags.filter((f) => f !== action.flag) : [...state.build.flags, action.flag];
      return commit(state, { slots: state.build.slots, flags });
    }
    case 'rename': {
      const name = action.name.trim().slice(0, 80);
      if (!name || name === state.build.name) return state;
      return { ...state, build: { ...state.build, name }, revision: state.revision + 1 };
    }
    case 'undo': {
      const prev = state.past.at(-1);
      if (!prev) return state;
      return {
        build: { ...state.build, ...prev },
        past: state.past.slice(0, -1),
        future: [snapshot(state.build), ...state.future],
        revision: state.revision + 1,
      };
    }
    case 'redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        build: { ...state.build, ...next },
        past: [...state.past, snapshot(state.build)],
        future: state.future.slice(1),
        revision: state.revision + 1,
      };
    }
  }
}
