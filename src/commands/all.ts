import { h, type Context } from 'koishi'
import type { Config } from '../config'
import { getContests } from '../services/contest'
import { formatContestListText, getContestWindowText } from '../services/format'
import { renderContestImage } from '../templates/takumi'
import { sendContestQQMarkdown } from '../qq'
import { sendContestPuppeteerImage } from './puppeteer'
import { resolveRenderFont } from '../utils/font'

export function registerAllCommand(ctx: Context, config: Config) {
  ctx.command(config.commandNameAll, getContestWindowText(config.contestWindowDays, '所有线上赛事'))
    .alias('all')
    .alias('contest-all')
    .action(async ({ session }) => {
      const contests = await getContests(ctx, config)
      const useText = config.outputFormats.includes('text')
      const useImage = config.outputFormats.includes('image')
      const usePuppeteerImage = config.outputFormats.includes('puppeteer_image')

      if (useText) {
        await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${formatContestListText(contests)}`)
      }

      if (useImage) {
        const start = Date.now()
        const waiting = config.enableWaitingHint
          ? (await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}正在生成比赛日程图片...`))[0]
          : null
        try {
          const fontPath = await resolveRenderFont(ctx, config, config.imageFontPath)
          const image = await renderContestImage(contests, {
            width: config.imageWidth,
            darkMode: config.imageDarkMode,
            fontPath,
            title: '近期算法比赛日程',
          })
          const payload = [
            ...(config.enableQuote ? [h.quote(session.messageId)] : []),
            h.image(image, 'image/png'),
          ]
          if (config.showRenderInfo) payload.push(h.text(`\nTakumi 渲染耗时：${Date.now() - start}ms`))
          await session.send(payload)
        } finally {
          if (waiting) await session.bot?.deleteMessage?.(session.channelId, waiting)
        }
      }

      if (usePuppeteerImage) {
        await sendContestPuppeteerImage(ctx, session, config, contests, '近期算法比赛日程', '正在使用 Puppeteer 生成比赛日程图片...')
      }

      const useQQMarkdown = config.outputFormats.includes('qqmarkdown_style') || config.outputFormats.includes('qqmarkdown_table')
      if (!useText && !useImage && !usePuppeteerImage && !useQQMarkdown) {
        await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}未启用任何输出格式，请在配置中选择 text / image / puppeteer_image / qqmarkdown_style / qqmarkdown_table。`)
      }
      await sendContestQQMarkdown(session, config, contests, '近期算法比赛日程')
    })
}
