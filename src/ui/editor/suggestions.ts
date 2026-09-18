import type { Catalog } from '../../data/catalog';

/**
 * Profile ids only have to agree between parts, so the editor offers the ones already
 * in use rather than a fixed list. Collected from every loaded pack.
 */
export interface Suggestions {
  caseStyle: string[];
  crownTube: string[];
  bezelSeat: string[];
  endLinkProfile: string[];
  integratedProfile: string[];
}

const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));

export function collectSuggestions(catalog: Catalog): Suggestions {
  const caseStyle = new Set<string>();
  const crownTube = new Set<string>();
  const bezelSeat = new Set<string>();
  const endLinkProfile = new Set<string>();
  const integratedProfile = new Set<string>();

  for (const pack of catalog.packs) {
    for (const part of pack.parts) {
      switch (part.type) {
        case 'case':
          caseStyle.add(part.style);
          crownTube.add(part.crownTube);
          bezelSeat.add(part.bezelSeat);
          if (part.endLinkProfile) endLinkProfile.add(part.endLinkProfile);
          if (part.integratedProfile) integratedProfile.add(part.integratedProfile);
          break;
        case 'crown':
          crownTube.add(part.tube);
          break;
        case 'bezel':
          bezelSeat.add(part.seat);
          break;
        case 'strap':
          if (part.endLinkProfile) endLinkProfile.add(part.endLinkProfile);
          if (part.integratedProfile) integratedProfile.add(part.integratedProfile);
          break;
      }
    }
  }
  // `integral` means the bezel is part of the case; it is never a bezel's own seat.
  bezelSeat.add('integral');

  return {
    caseStyle: sorted(caseStyle),
    crownTube: sorted(crownTube),
    bezelSeat: sorted(bezelSeat),
    endLinkProfile: sorted(endLinkProfile),
    integratedProfile: sorted(integratedProfile),
  };
}
