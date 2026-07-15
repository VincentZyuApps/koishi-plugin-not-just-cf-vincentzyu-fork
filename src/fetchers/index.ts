import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest, OjName } from '../types'
import { fetchAtcoderContests } from './atcoder'
import { fetchCodeforcesContests } from './codeforces'
import { fetchLeetCodeContests } from './leetcode'
import { fetchLuoguContests } from './luogu'
import { fetchNowCoderContests } from './nowcoder'

export async function fetchContestsByOj(ctx: Context, config: Config, oj: OjName): Promise<Contest[]> {
  switch (oj) {
    case 'Codeforces':
      return fetchCodeforcesContests(ctx, config)
    case 'NowCoder':
      return fetchNowCoderContests(ctx, config)
    case 'LeetCode':
      return fetchLeetCodeContests(ctx, config)
    case 'Luogu':
      return fetchLuoguContests(ctx, config)
    case 'AtCoder':
      return fetchAtcoderContests(ctx, config)
    default:
      return []
  }
}
