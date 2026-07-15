import * as cheerio from 'cheerio'
import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'

interface LuoguContestEntry {
  id: number
  name: string
  startTime: number
  endTime: number
}
function normalizeLuoguContestEntries(data: any): LuoguContestEntry[] {
  if (Array.isArray(data?.currentData?.contests?.result)) return data.currentData.contests.result
  if (Array.isArray(data?.data?.contests?.result)) return data.data.contests.result
  throw new Error('invalid luogu contest payload')
}

function extractLuoguContestEntries(payload: string | Record<string, any>): LuoguContestEntry[] {
  if (typeof payload === 'string') {
    const $ = cheerio.load(payload)
    const serialized = $('#lentille-context').text().trim()
    if (!serialized) throw new Error('luogu lentille-context payload not found')
    return normalizeLuoguContestEntries(JSON.parse(serialized))
  }
  if (payload && typeof payload === 'object') return normalizeLuoguContestEntries(payload)
  throw new Error('unsupported luogu payload type')
}

export async function fetchLuoguContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const data = await ctx.http.get('https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1')
  return extractLuoguContestEntries(data)
    .filter((contest) => shouldIncludeContest(contest.startTime, contest.endTime, currentTime, config.contestWindowDays))
    .map((contest) => ({
      oj: 'Luogu',
      name: contest.name,
      startTime: contest.startTime,
      duration: contest.endTime - contest.startTime,
    }))
}
