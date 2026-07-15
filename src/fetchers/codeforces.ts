import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'

export async function fetchCodeforcesContests(ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const data = await ctx.http.get('https://codeforces.com/api/contest.list')
  const list = Array.isArray(data?.result) ? data.result : []

  return list
    .filter((contest: any) => {
      const start = Number(contest.startTimeSeconds)
      const duration = Number(contest.durationSeconds)
      return shouldIncludeContest(start, start + duration, currentTime, config.contestWindowDays)
    })
    .map((contest: any) => ({
      oj: 'Codeforces',
      name: String(contest.name || 'Codeforces Contest'),
      startTime: Number(contest.startTimeSeconds),
      duration: Number(contest.durationSeconds),
    }))
}
