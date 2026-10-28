import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Catalog } from '../../data/catalog';
import type { ResolvedParts } from '../../domain/rules';
import type { Part, PartRef, Slot } from '../../domain/schemas';
import { WatchSvg } from '../../render/WatchSvg';

/**
 * True once the element has scrolled near the viewport, and stays true after (so scrolling back
 * doesn't redraw). Without IntersectionObserver (jsdom, very old browsers) it never fires: the
 * placeholder stays and the row works as before, rather than drawing every thumbnail eagerly.
 */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (seen || !el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen];
}

interface Props {
  slot: Slot;
  part: Part;
  partRef: PartRef;
  /** The build's current parts. The candidate is swapped into `slot`, so the thumbnail shows it on this watch. */
  base: ResolvedParts;
  slots: Partial<Record<Slot, PartRef>>;
  catalog: Catalog;
}

/** A small drawing of the candidate on the current build, rendered only once its row is near the viewport. */
export function CandidateThumb(props: Props) {
  const [box, seen] = useInView<HTMLSpanElement>();
  return (
    <span ref={box} className="candidate-thumb" aria-hidden="true" data-ready={seen ? '' : undefined}>
      {seen && <ThumbDrawing {...props} />}
    </span>
  );
}

function ThumbDrawing({ slot, part, partRef, base, slots, catalog }: Props) {
  const parts = useMemo(() => ({ ...base, [slot]: part }) as ResolvedParts, [base, slot, part]);
  // Uploaded art is looked up per pack, exactly as the preview stage does.
  const art = useMemo(() => catalog.artFor({ ...slots, [slot]: partRef }), [catalog, slots, slot, partRef]);
  // A strap is mostly off the head, so it needs the wider framing.
  return <WatchSvg parts={parts} art={art} framing={slot === 'strap' ? 'watch' : 'head'} title={part.name} />;
}
