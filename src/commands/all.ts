import type { Context } from 'koishi'
import type { Config } from '../config'
import { getContests } from '../services/contest'
import { getContestWindowText } from '../services/format'
import { sendContestOutputsToSession } from '../services/output'

export function registerAllCommand(ctx: Context, config: Config) {
  ctx.command(config.commandNameAll, getContestWindowText(config.contestWindowDays, '所有线上赛事'))
    .alias('all')
    .alias('contest-all')
    .action(async ({ session }) => {
      const contests = await getContests(ctx, config)
      await sendContestOutputsToSession(ctx, session, config, contests, {
        title: '近期算法比赛日程',
        takumiWaitingText: '🖼️ 正在使用 Takumi 生成比赛日程图片...',
        puppeteerWaitingText: '🎨 正在使用 Puppeteer 生成比赛日程图片...',
      })
    })
}
