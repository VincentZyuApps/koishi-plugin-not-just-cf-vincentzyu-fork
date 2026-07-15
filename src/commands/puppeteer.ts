import { h, type Context, type Session } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { renderContestPuppeteerImage } from '../templates/puppeteer'
import { ensureLxgwFont } from '../utils/font'

export async function sendContestPuppeteerImage(
  ctx: Context,
  session: Session,
  config: Config,
  contests: Contest[],
  title: string,
  waitingText: string,
) {
  const start = Date.now()
  const waiting = config.enableWaitingHint
    ? (await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${waitingText}`))[0]
    : null

  try {
    const fontPath = await ensureLxgwFont(ctx)
    const image = await renderContestPuppeteerImage(ctx, contests, {
      width: config.imageWidth,
      darkMode: config.imageDarkMode,
      fontPath,
      title,
    })
    const payload = [
      ...(config.enableQuote ? [h.quote(session.messageId)] : []),
      h.image(image, 'image/png'),
    ]
    if (config.showRenderInfo) payload.push(h.text(`\nPuppeteer 渲染耗时：${Date.now() - start}ms`))
    await session.send(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger.error(`Puppeteer 比赛日程出图失败：${message}`)
    await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}Puppeteer 出图失败：${message}`)
  } finally {
    if (waiting) {
      try {
        await session.bot?.deleteMessage?.(session.channelId, waiting)
      } catch (error) {
        ctx.logger.debug(`删除 Puppeteer 出图等待提示失败：${error instanceof Error ? error.message : error}`)
      }
    }
  }
}
