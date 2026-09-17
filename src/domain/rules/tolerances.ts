/**
 * Fitment tolerances. Engineering estimates — tune against real known-good builds
 * (docs/compatibility-spec.md §7.6). All lengths in mm, angles in degrees.
 */
export const TOL = {
  /** Hand hole vs movement post. */
  handPost: 0.015,
  /** Crystal vs case crystal seat (press/gasket fit). */
  crystal: 0.05,
  /** Chapter ring outer diameter vs case ring seat. */
  ringSeat: 0.1,
  insertOuter: 0.1,
  insertInner: 0.2,
  /** Allowed overrun of movement stack height before it is an error (up to this is a warning). */
  stack: 0.2,
  /** Chapter ring must overlap an undersized dial by at least this much to hide the gap. */
  dialGapCover: 0.2,
  /** Minute hand may reach this far past the ring/dial edge before warning. */
  handReach: 0.3,
  lugWidth: 0.01,
  dateAlignDeg: 1.0,
  dayAlignDeg: 1.0,
  apertureAlignDeg: 3.0,
  magnifierAlignDeg: 3.0,
} as const;
