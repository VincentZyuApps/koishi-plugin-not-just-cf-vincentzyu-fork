import { h, type Context, type Session } from 'koishi'
import type { Config } from '../config'
import type { Contest } from '../types'
import { renderContestPuppeteerImage } from '../templates/puppeteer'
import { ensureLxgwFont } from '../utils/font'
import { logInfo } from '../utils/logger'

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
    const fontPath = await ensureLxgwFont(ctx, config)
    const image = await renderContestPuppeteerImage(ctx, contests, {
      width: config.imageWidth,
      darkMode: config.imageDarkMode,
      fontPath,
      title,
    }, config)
    const payload = [
      ...(config.enableQuote ? [h.quote(session.messageId)] : []),
      h.image(image, 'image/png'),
    ]
    if (config.showRenderInfo) payload.push(h.text(`\nPuppeteer 渲染耗时：${Date.now() - start}ms`))
    await session.send(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logInfo(
      ctx,
      config,
      '[ERROR] Puppeteer 比赛日程出图失败。',
      `[ERROR] ${error instanceof Error ? error.stack || error.message : message}`,
    )
    await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}Puppeteer 出图失败：${message}`)
  } finally {
    if (waiting) {
      try {
        await session.bot?.deleteMessage?.(session.channelId, waiting)
      } catch (error) {
        logInfo(
          ctx,
          config,
          '[WARN] 删除 Puppeteer 出图等待提示失败。',
          `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
        )
      }
    }
  }
}
