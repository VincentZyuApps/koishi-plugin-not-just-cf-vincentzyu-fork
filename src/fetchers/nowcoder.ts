import * as cheerio from 'cheerio'
import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'

function parseNowCoderTime(text: string): { startTime: number; duration: number } | null {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+至\s+(?:(\d{4}-\d{2}-\d{2})\s+)?(\d{2}:\d{2})/)
  if (!match) return null

  const startDate = match[1]
  const startClock = match[2]
  const endDate = match[3] || startDate
  const endClock = match[4]
  const start = new Date(`${startDate}T${startClock}:00+08:00`).getTime() / 1000
  const end = new Date(`${endDate}T${endClock}:00+08:00`).getTime() / 1000
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return { startTime: start, duration: end - start }
}
export async function fetchNowCoderContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const response = await ctx.http.get('https://ac.nowcoder.com/acm/contest/vip-index?topCategoryFilter=13')
  const $ = cheerio.load(response)
  const contests: Contest[] = []

  $('.nk-main .platform-mod').eq(0).find('.platform-item-main').each((_, element) => {
    const name = $(element).find('h4 a').text().trim()
    const contestTime = $(element).find('.match-time-icon').text()
    const parsed = parseNowCoderTime(contestTime)
    if (!name || !parsed) return

    if (shouldIncludeContest(parsed.startTime, parsed.startTime + parsed.duration, currentTime, config.contestWindowDays)) {
      contests.push({
        oj: 'NowCoder',
        name,
        startTime: parsed.startTime,
        duration: parsed.duration,
      })
    }
  })

  return contests
}
