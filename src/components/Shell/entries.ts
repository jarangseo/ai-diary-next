import { cache } from 'react'
import { getAllDiaries } from '@/lib/diary'

/**
 * Every entry of a user, read once per request: the shell's sidebar and the home page
 * both need the list, and `cache` lets them share one query.
 */
export const getEntries = cache(getAllDiaries)
