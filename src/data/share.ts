import { z } from 'zod';
import { ModFlag, Slot, Slug, type Build, type PartRef } from '../domain/schemas';

// A share link carries a build's name, parts and mods — never the parts themselves — as
// compact JSON, deflated and base64url-encoded into the URL hash (`#/share/<code>`).
// Parts are named `pack/part`, so whoever opens the link needs the same packs; the build
// bundle (data/bundle.ts) is the way to send parts along.

/** Bump when the payload changes shape; old links must keep decoding. */
const SHARE_VERSION = 1;

/** What a link holds: enough to rebuild the build, nothing else (no ids or timestamps). */
export type SharedBuild = Pick<Build, 'name' | 'slots' | 'flags' | 'notes'>;

const RefText = z.string().transform((text, ctx): PartRef => {
  const [packId, partId, ...rest] = text.split('/');
  const ok = rest.length === 0 && Slug.safeParse(packId).success && Slug.safeParse(partId).success;
  if (!ok) ctx.addIssue({ code: 'custom', message: `"${text}" is not a pack/part reference` });
  return { packId: packId ?? '', partId: partId ?? '' };
});

const Payload = z.object({
  v: z.literal(SHARE_VERSION),
  n: z.string().min(1).max(80),
  s: z.partialRecord(Slot, RefText),
  f: z.array(ModFlag).default([]),
  o: z.string().max(2000).optional(),
});

export class ShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShareError';
  }
}

export async function encodeShare(build: SharedBuild): Promise<string> {
  const payload: z.input<typeof Payload> = {
    v: SHARE_VERSION,
    n: build.name,
    s: Object.fromEntries(Object.entries(build.slots).map(([slot, ref]) => [slot, `${ref.packId}/${ref.partId}`])),
    ...(build.flags.length ? { f: build.flags } : {}),
    ...(build.notes ? { o: build.notes } : {}),
  };
  return toBase64Url(await transform(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw')));
}

/** Throws ShareError with a message fit to show when the code is damaged or from a newer app. */
export async function decodeShare(code: string): Promise<SharedBuild> {
  let raw: unknown;
  try {
    const bytes = await transform(fromBase64Url(code), new DecompressionStream('deflate-raw'));
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ShareError('This share link is damaged or incomplete. Ask for it to be copied again.');
  }
  const version = (raw as { v?: unknown } | null)?.v;
  if (typeof version === 'number' && version > SHARE_VERSION) {
    throw new ShareError('This link was made by a newer version of the app.');
  }
  const result = Payload.safeParse(raw);
  if (!result.success) throw new ShareError('This share link does not describe a build.');
  const { n, s, f, o } = result.data;
  return { name: n, slots: s, flags: f, ...(o ? { notes: o } : {}) };
}

/** Full URL for a share code, relative to the page the app is served from. */
export const shareUrl = (code: string, location: Pick<Location, 'origin' | 'pathname'> = window.location): string =>
  `${location.origin}${location.pathname}#/share/${code}`;

// ── bytes ───────────────────────────────────────────────────────────────────

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  // Errors (bad compressed data) surface on the readable side; the writer's copies are dropped.
  const writer = stream.writable.getWriter();
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('not base64url');
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
