// Memory — the differentiator (PRODUCT_DIRECTION, *Memory*; #76). In conversation the AI
// may draw on what the user wrote recently: about two weeks of 일기, condensed. If this
// shipped as a plain LLM passthrough, the product would have lost its reason to exist.
//
// The window and the condensing are pure functions, tested on their own; only
// `loadMemoryEntries` and `memoryFor` touch the database.
import { supabase } from './supabase'
import { getSettings } from './settings'
import { todayIn } from './entryGroups'

/** How far back memory reaches, in the user's own calendar days (v2.0; the archive is v2.3). */
export const MEMORY_DAYS = 14
const PER_ENTRY_CHARS = 400
const MAX_CONTEXT_CHARS = 4000
const MAX_ENTRIES = 30

export interface MemoryEntry {
  id: string
  date: string // YYYY-MM-DD
  title?: string
  text: string
}

interface MemoryRow {
  id: string
  date: string
  title: string | null
  mode: 'chat' | 'write'
  content: string
  summary: string | null
}

/** An entry's 일기: the draft of a chat entry, 내 글 of a written one. Empty until there is one. */
export function entryText(row: Pick<MemoryRow, 'mode' | 'content' | 'summary'>): string {
  return (row.mode === 'chat' ? (row.summary ?? '') : row.content).trim()
}

/** `YYYY-MM-DD` minus whole days, as calendar dates (no time zone involved). */
export function dateKeyMinusDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function weekday(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/**
 * The entries condensed for the model: newest first, one line each, cut per entry and in
 * total so the prompt — and the bill — stay bounded however much was written. The weekday
 * is there so the reply can say "화요일에도…" without doing date arithmetic. Empty when
 * there is nothing to remember.
 */
export function buildMemoryContext(entries: MemoryEntry[]): string {
  const lines: string[] = []
  let total = 0
  const newestFirst = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  for (const entry of newestFirst) {
    const text = entry.text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const body = text.length > PER_ENTRY_CHARS ? `${text.slice(0, PER_ENTRY_CHARS)}…` : text
    const title = entry.title?.trim() ? ` "${entry.title.trim()}"` : ''
    const line = `- ${entry.date} ${weekday(entry.date)}${title}: ${body}`
    if (total + line.length > MAX_CONTEXT_CHARS) break
    lines.push(line)
    total += line.length + 1
  }
  return lines.join('\n')
}

/**
 * The day memory looks back from (#128): the entry's own date. A conversation about a past
 * entry must not know what came after it — the AI naming someone the user met last week,
 * in a talk about a day a month ago, reads as the app making things up. Today for an
 * entry dated today, no entry, or one dated in the future.
 */
export function memoryAnchor(today: string, entryDate?: string): string {
  return entryDate && entryDate < today ? entryDate : today
}

/**
 * The user's entries from the MEMORY_DAYS up to `until` (default today) of their calendar,
 * except the current one. Nothing dated after `until`.
 */
export async function loadMemoryEntries(
  userId: string,
  {
    excludeId,
    timeZone,
    until,
    now = new Date(),
  }: { excludeId?: string; timeZone: string; until?: string; now?: Date }
): Promise<MemoryEntry[]> {
  const end = memoryAnchor(todayIn(now, timeZone), until)
  const { data, error } = await supabase
    .from('diaries')
    .select('id, date, title, mode, content, summary')
    .eq('user_id', userId)
    .gte('date', dateKeyMinusDays(end, MEMORY_DAYS))
    .lte('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MAX_ENTRIES)

  if (error) throw new Error(`loadMemoryEntries failed: ${error.message}`)

  return (data as MemoryRow[])
    .filter((row) => row.id !== excludeId)
    .map((row) => ({
      id: row.id,
      date: row.date,
      title: row.title ?? undefined,
      text: entryText(row),
    }))
    .filter((entry) => entry.text)
}

// ---------------------------------------------------------------------------
// Older entries (#108): one memory note each, beyond the 14-day window
// ---------------------------------------------------------------------------

const MAX_OLDER_CHARS = 2000
const MAX_OLDER_NOTES = 60

export interface MemoryNote {
  id: string
  date: string // YYYY-MM-DD
  note: string
}

/**
 * Older entries as one line each, newest first, capped — the layered half of memory. A
 * year of entries stays within the cap because only the newest notes that fit are kept;
 * monthly roll-ups are the next layer if that ever drops too much (PRODUCT_DIRECTION).
 */
export function buildOlderNotes(notes: Pick<MemoryNote, 'date' | 'note'>[]): string {
  const lines: string[] = []
  let total = 0
  const newestFirst = [...notes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  for (const { date, note } of newestFirst) {
    const text = note.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const line = `- ${date}: ${text}`
    if (total + line.length > MAX_OLDER_CHARS) break
    lines.push(line)
    total += line.length + 1
  }
  return lines.join('\n')
}

/** Notes for entries dated before `before` (the window's first day), newest first. */
export async function loadOlderNotes(userId: string, before: string): Promise<MemoryNote[]> {
  const { data, error } = await supabase
    .from('diaries')
    .select('id, date, memory_note')
    .eq('user_id', userId)
    .lt('date', before)
    .not('memory_note', 'is', null)
    .order('date', { ascending: false })
    .limit(MAX_OLDER_NOTES)

  if (error) throw new Error(`loadOlderNotes failed: ${error.message}`)

  return (data as { id: string; date: string; memory_note: string }[]).map((row) => ({
    id: row.id,
    date: row.date,
    note: row.memory_note,
  }))
}

/** The two layers as one block for the prompt; either may be empty. */
export function combineMemory(recent: string, older: string): string {
  const parts: string[] = []
  if (recent) parts.push(`[최근 2주]\n${recent}`)
  if (older) parts.push(`[그 이전 — 한 줄 메모]\n${older}`)
  return parts.join('\n\n')
}

/**
 * An entry memory may have drawn on: a source chip if the reply turns out to mention it
 * (#76, lib/memorySources.ts).
 */
export interface MemorySource {
  id: string
  date: string
  title?: string
  /** What the AI saw of it: the condensed 일기 or the one-line note. */
  text: string
}

export interface MemoryContext {
  /** The block for the prompt; '' when there is nothing to remember. */
  text: string
  /** Every entry in it, newest first, for source chips. */
  sources: MemorySource[]
}

const NO_MEMORY: MemoryContext = { text: '', sources: [] }

/**
 * Memory for a reply in the conversation about `entry`: the prompt block and the entries
 * behind it. Empty when the user turned `지난 일기 참고하기` off, has nothing to remember,
 * or a read fails. Memory is an addition to the reply: it never stops one.
 *
 * Seen from the entry's date (`memoryAnchor`): the two weeks up to it, older notes before
 * that, and nothing written about a later day.
 */
export async function memoryContextFor(
  userId: string,
  entry?: { id: string; date: string }
): Promise<MemoryContext> {
  try {
    const { settings } = await getSettings(userId)
    if (!settings.memoryEnabled) return NO_MEMORY
    const end = memoryAnchor(todayIn(new Date(), settings.timezone), entry?.date)
    const [entries, notes] = await Promise.all([
      loadMemoryEntries(userId, { excludeId: entry?.id, timeZone: settings.timezone, until: end }),
      loadOlderNotes(userId, dateKeyMinusDays(end, MEMORY_DAYS)),
    ])
    return {
      text: combineMemory(buildMemoryContext(entries), buildOlderNotes(notes)),
      sources: [
        ...entries.map(({ id, date, title, text }) => ({ id, date, title, text })),
        ...notes.map(({ id, date, note }) => ({ id, date, text: note })),
      ],
    }
  } catch (error) {
    console.error(error)
    return NO_MEMORY
  }
}

/** The prompt block alone (see `memoryContextFor`). */
export async function memoryFor(
  userId: string,
  entry?: { id: string; date: string }
): Promise<string> {
  return (await memoryContextFor(userId, entry)).text
}
