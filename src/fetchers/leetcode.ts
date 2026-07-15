import axios from 'axios'
import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { shouldIncludeContest } from '../utils/filter'

export async function fetchLeetCodeContests(_ctx: Context, config: Config): Promise<Contest[]> {
  const currentTime = Math.floor(Date.now() / 1000)
  const response = await axios.post('https://leetcode.com/graphql', {
    operationName: null,
    variables: {},
    query: `{
      allContests {
        title
        startTime
        duration
        isVirtual
      }
    }`,
  }, {
    headers: {
      Referer: 'https://leetcode.com/',
      'Content-Type': 'application/json',
    },
  })

  const contests = response.data?.data?.allContests
  if (!Array.isArray(contests)) return []

  return contests
    .filter((contest: any) => {
      const start = Number(contest.startTime)
      const duration = Number(contest.duration)
      return !contest.isVirtual && shouldIncludeContest(start, start + duration, currentTime, config.contestWindowDays)
    })
    .map((contest: any) => ({
      oj: 'LeetCode',
      name: String(contest.title || 'LeetCode Contest'),
      startTime: Number(contest.startTime),
      duration: Number(contest.duration),
    }))
}
