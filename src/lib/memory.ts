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

/** The user's entries from the last MEMORY_DAYS of their calendar, except the current one. */
export async function loadMemoryEntries(
  userId: string,
  { excludeId, timeZone, now = new Date() }: { excludeId?: string; timeZone: string; now?: Date }
): Promise<MemoryEntry[]> {
  const today = todayIn(now, timeZone)
  const { data, error } = await supabase
    .from('diaries')
    .select('id, date, title, mode, content, summary')
    .eq('user_id', userId)
    .gte('date', dateKeyMinusDays(today, MEMORY_DAYS))
    .lte('date', today)
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

/**
 * The memory block for a reply in the conversation about `currentEntryId`, or '' when
 * the user turned `지난 일기 참고하기` off, has nothing recent, or a read fails. Memory is
 * an addition to the reply: it never stops one.
 */
export async function memoryFor(userId: string, currentEntryId?: string): Promise<string> {
  try {
    const { settings } = await getSettings(userId)
    if (!settings.memoryEnabled) return ''
    const entries = await loadMemoryEntries(userId, {
      excludeId: currentEntryId,
      timeZone: settings.timezone,
    })
    return buildMemoryContext(entries)
  } catch (error) {
    console.error(error)
    return ''
  }
}
