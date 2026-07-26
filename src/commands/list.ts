import type { Context } from 'koishi'
import type { Config } from '../config'
import { resolveOjAlias, OJ_ALIAS_LIST } from '../constants/oj'
import { getContests } from '../services/contest'
import { getContestWindowText } from '../services/format'
import { sendContestOutputsToSession } from '../services/output'

export function registerListCommand(ctx: Context, config: Config) {
  ctx.command(`${config.commandNameList} <contestName:string>`, getContestWindowText(config.contestWindowDays, '指定平台线上赛事'))
    .alias('list')
    .alias('contest-list')
    .action(async ({ session }, contestName) => {
      const oj = resolveOjAlias(contestName)
      if (!oj || !config.enabledOjs.includes(oj)) {
        return `需要 ${config.commandNameList} ${OJ_ALIAS_LIST.join('/')} \n例子：【${config.commandNameList} cf】`
      }

      const contests = await getContests(ctx, config, [oj])
      const title = `${oj} 比赛日程`
      await sendContestOutputsToSession(ctx, session, config, contests, {
        title,
        takumiWaitingText: `🖼️ 正在使用 Takumi 生成 ${oj} 比赛图片...`,
        puppeteerWaitingText: `🎨 正在使用 Puppeteer 生成 ${oj} 比赛图片...`,
      })
    })
}
