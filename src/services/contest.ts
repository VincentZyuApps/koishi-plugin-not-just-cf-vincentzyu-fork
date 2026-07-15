import type { Context } from 'koishi'
import type { Config } from '../config'
import type { Contest, OjName } from '../types'
import { fetchContestsByOj } from '../fetchers'
import { logInfo } from '../utils/logger'

export function sortContests(contests: Contest[]): Contest[] {
  return contests.slice().sort((a, b) => a.startTime - b.startTime)
}
export async function getContests(ctx: Context, config: Config, ojs: OjName[] = config.enabledOjs): Promise<Contest[]> {
  const groups = await Promise.all(ojs.map(async (oj) => {
    try {
      return await fetchContestsByOj(ctx, config, oj)
    } catch (error: any) {
      logInfo(
        ctx,
        config,
        `[WARN] ${oj} 比赛数据获取失败，本次按空列表处理。`,
        `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
      )
      return []
    }
  }))
  return sortContests(groups.flat())
}
