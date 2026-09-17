import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Build } from '../../domain/schemas';
import { getBuild, saveBuild, type ModWatchDB } from '../../storage/db';
import { draftReducer, initDraft, type DraftAction, type DraftState } from './draft';

export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

export type DraftResult =
  | { status: 'loading' }
  | { status: 'missing' }
  | {
      status: 'ready';
      build: Build;
      dispatch: (action: DraftAction) => void;
      canUndo: boolean;
      canRedo: boolean;
      saveState: SaveState;
      /** Save immediately (e.g. before navigating away or exporting). */
      flush: () => Promise<void>;
    };

export const AUTOSAVE_MS = 500;

type Loaded = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; state: DraftState };

function loadedReducer(s: Loaded, a: DraftAction | { type: 'loaded'; build: Build | undefined }): Loaded {
  if (a.type === 'loaded') return a.build ? { status: 'ready', state: initDraft(a.build) } : { status: 'missing' };
  if (s.status !== 'ready') return s;
  const state = draftReducer(s.state, a);
  return state === s.state ? s : { status: 'ready', state };
}

/** Load a build from storage, keep an undo history, and autosave changes (debounced). */
export function useBuildDraft(db: ModWatchDB, id: string): DraftResult {
  const [loaded, dispatch] = useReducer(loadedReducer, { status: 'loading' });
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const latest = useRef<{ build: Build; revision: number } | null>(null);
  const savedRevision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getBuild(db, id).then(
      (build) => !cancelled && dispatch({ type: 'loaded', build }),
      () => !cancelled && dispatch({ type: 'loaded', build: undefined }),
    );
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    const current = latest.current;
    if (!current || current.revision === savedRevision.current) return;
    setSaveState('saving');
    try {
      await saveBuild(db, { ...current.build, updatedAt: new Date().toISOString() });
      savedRevision.current = Math.max(savedRevision.current, current.revision);
      setSaveState(latest.current?.revision === current.revision ? 'saved' : 'pending');
    } catch {
      setSaveState('error');
    }
  }, [db]);

  const state = loaded.status === 'ready' ? loaded.state : null;

  useEffect(() => {
    if (!state) return;
    latest.current = { build: state.build, revision: state.revision };
    if (state.revision === savedRevision.current) return;
    setSaveState('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  }, [state, save]);

  // Don't lose the last edit when leaving the page or the screen.
  useEffect(() => {
    const onHide = () => void save();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      void save();
    };
  }, [save]);

  if (loaded.status !== 'ready') return loaded;
  return {
    status: 'ready',
    build: loaded.state.build,
    dispatch,
    canUndo: loaded.state.past.length > 0,
    canRedo: loaded.state.future.length > 0,
    saveState,
    flush: save,
  };
}
