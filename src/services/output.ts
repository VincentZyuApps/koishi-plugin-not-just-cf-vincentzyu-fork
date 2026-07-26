import { h, type Bot, type Context, type Session } from 'koishi'
import type { Config } from '../config'
import {
  buildContestKeyboard,
  buildContestMarkdown,
  buildContestMarkdownTable,
  sendQQMarkdownToTarget,
} from '../qq'
import { renderContestPuppeteerImage } from '../templates/puppeteer'
import { renderContestTakumiImage } from '../templates/takumi'
import type { Contest } from '../types'
import { resolveRenderFont } from '../utils/font'
import { logInfo, logVerbose } from '../utils/logger'
import { formatContestListText } from './format'
import { resolveAlertBot } from './bot'

interface ContestOutputTarget {
  kind: 'session' | 'alert'
  platform: string
  label: string
  bot: Bot
  channelId: string
  messageId?: string
  timestamp?: number
  send: (content: any) => Promise<string[]>
}

export interface SessionContestOutputOptions {
  title: string
  takumiWaitingText: string
  puppeteerWaitingText: string
}

interface ContestOutputOptions {
  title: string
  takumiWaitingText?: string
  puppeteerWaitingText?: string
}

function withOptionalQuote(target: ContestOutputTarget, config: Config, content: any): any {
  if (target.kind !== 'session' || !config.enableQuote || !target.messageId) return content
  const elements = Array.isArray(content) ? content : [content]
  return [h.quote(target.messageId), ...elements]
}

async function sendSafely(
  ctx: Context,
  config: Config,
  target: ContestOutputTarget,
  content: any,
  formatLabel: string,
): Promise<string[]> {
  try {
    return await target.send(content)
  } catch (error) {
    logInfo(
      ctx,
      config,
      `[ERROR] ${formatLabel}发送到目标失败：${target.label}。`,
      `[ERROR] ${error instanceof Error ? error.stack || error.message : error}`,
    )
    return []
  }
}

async function sendToAllTargets(
  ctx: Context,
  config: Config,
  targets: ContestOutputTarget[],
  content: (target: ContestOutputTarget) => any,
  formatLabel: string,
): Promise<void> {
  await Promise.all(targets.map((target) => sendSafely(
    ctx,
    config,
    target,
    content(target),
    formatLabel,
  )))
}

async function sendWaitingHints(
  ctx: Context,
  config: Config,
  targets: ContestOutputTarget[],
  waitingText?: string,
): Promise<Map<ContestOutputTarget, string>> {
  const waitingMessages = new Map<ContestOutputTarget, string>()
  if (!config.enableWaitingHint || !waitingText) return waitingMessages

  await Promise.all(targets
    .filter((target) => target.kind === 'session')
    .map(async (target) => {
      const messageIds = await sendSafely(
        ctx,
        config,
        target,
        withOptionalQuote(target, config, waitingText),
        '图片渲染等待提示',
      )
      if (messageIds[0]) waitingMessages.set(target, messageIds[0])
    }))
  return waitingMessages
}

async function deleteWaitingHints(
  ctx: Context,
  config: Config,
  waitingMessages: Map<ContestOutputTarget, string>,
): Promise<void> {
  await Promise.all(Array.from(waitingMessages, async ([target, messageId]) => {
    try {
      await target.bot.deleteMessage(target.channelId, messageId)
    } catch (error) {
      logInfo(
        ctx,
        config,
        '[WARN] 删除图片渲染等待提示失败。',
        `[WARN] ${error instanceof Error ? error.stack || error.message : error}`,
      )
    }
  }))
}

async function sendImageOutput(
  ctx: Context,
  config: Config,
  targets: ContestOutputTarget[],
  options: {
    formatLabel: string
    waitingText?: string
    showRenderInfo: boolean
    render: () => Promise<Buffer>
  },
): Promise<void> {
  const waitingMessages = await sendWaitingHints(ctx, config, targets, options.waitingText)
  const start = Date.now()
  try {
    const image = await options.render()
    const elapsed = Date.now() - start
    await sendToAllTargets(
      ctx,
      config,
      targets,
      (target) => withOptionalQuote(target, config, [
        h.image(image, 'image/png'),
        ...(options.showRenderInfo ? [h.text(`\n${options.formatLabel} 渲染耗时：${elapsed}ms`)] : []),
      ]),
      `${options.formatLabel} 图片`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logInfo(
      ctx,
      config,
      `[ERROR] ${options.formatLabel} 比赛日程出图失败。`,
      `[ERROR] ${error instanceof Error ? error.stack || error.message : message}`,
    )
    const sessionTargets = targets.filter((target) => target.kind === 'session')
    await sendToAllTargets(
      ctx,
      config,
      sessionTargets,
      (target) => withOptionalQuote(target, config, `${options.formatLabel} 出图失败：${message}`),
      `${options.formatLabel} 出图失败提示`,
    )
  } finally {
    await deleteWaitingHints(ctx, config, waitingMessages)
  }
}

async function sendContestOutputs(
  ctx: Context,
  config: Config,
  contests: Contest[],
  targets: ContestOutputTarget[],
  options: ContestOutputOptions,
): Promise<void> {
  if (!targets.length) return

  const formats = new Set(config.outputFormats)
  if (!formats.size) {
    const sessionTargets = targets.filter((target) => target.kind === 'session')
    await sendToAllTargets(
      ctx,
      config,
      sessionTargets,
      (target) => withOptionalQuote(
        target,
        config,
        '未启用任何输出格式，请在配置中选择 text / takumi_image / puppeteer_image / qqmarkdown_style / qqmarkdown_table。',
      ),
      '未配置输出格式提示',
    )
    return
  }

  if (formats.has('text')) {
    const visibleContests = contests.slice(0, config.textMaxDisplay)
    const text = formatContestListText(visibleContests, contests.length, options.title)
    await sendToAllTargets(
      ctx,
      config,
      targets,
      (target) => withOptionalQuote(target, config, text),
      '文字比赛日程',
    )
  }

  if (formats.has('takumi_image')) {
    await sendImageOutput(ctx, config, targets, {
      formatLabel: 'Takumi',
      waitingText: options.takumiWaitingText,
      showRenderInfo: config.takumiShowRenderInfo,
      render: async () => {
        const visibleContests = contests.slice(0, config.takumiImageMaxDisplay)
        const fontPath = await resolveRenderFont(ctx, config, config.takumiImageFontPath)
        return renderContestTakumiImage(visibleContests, {
          width: config.takumiImageWidth,
          darkMode: config.takumiImageDarkMode,
          fontPath,
          title: options.title,
          totalContestCount: contests.length,
        })
      },
    })
  }

  if (formats.has('puppeteer_image')) {
    await sendImageOutput(ctx, config, targets, {
      formatLabel: 'Puppeteer',
      waitingText: options.puppeteerWaitingText,
      showRenderInfo: config.puppeteerShowRenderInfo,
      render: async () => {
        const visibleContests = contests.slice(0, config.puppeteerImageMaxDisplay)
        const fontPath = await resolveRenderFont(ctx, config, config.puppeteerImageFontPath)
        return renderContestPuppeteerImage(ctx, visibleContests, {
          width: config.puppeteerImageWidth,
          darkMode: config.puppeteerImageDarkMode,
          fontPath,
          title: options.title,
          totalContestCount: contests.length,
        }, config)
      },
    })
  }

  const qqFormats = [
    ...(formats.has('qqmarkdown_style') ? ['qqmarkdown_style'] : []),
    ...(formats.has('qqmarkdown_table') ? ['qqmarkdown_table'] : []),
  ]
  if (!qqFormats.length) return

  const qqTargets = targets.filter((target) => target.platform === 'qq')
  for (const target of targets) {
    if (target.platform === 'qq') continue
    logVerbose(
      ctx,
      config,
      `[输出] 目标 ${target.label} 不是 QQ 官方 Bot，已跳过 ${qqFormats.join('、')}。`,
    )
  }
  if (!qqTargets.length) return

  const keyboard = buildContestKeyboard(config, config.qqMarkdownKeyboardJson)
  if (formats.has('qqmarkdown_style')) {
    const markdown = buildContestMarkdown(contests, config, options.title)
    await Promise.all(qqTargets.map((target) => sendQQMarkdownToTarget(
      ctx,
      target,
      config,
      markdown,
      keyboard,
    )))
  }
  if (formats.has('qqmarkdown_table')) {
    const markdown = buildContestMarkdownTable(contests, config, options.title)
    await Promise.all(qqTargets.map((target) => sendQQMarkdownToTarget(
      ctx,
      target,
      config,
      markdown,
      keyboard,
    )))
  }
}

export async function sendContestOutputsToSession(
  ctx: Context,
  session: Session,
  config: Config,
  contests: Contest[],
  options: SessionContestOutputOptions,
): Promise<void> {
  const target: ContestOutputTarget = {
    kind: 'session',
    platform: session.platform,
    label: `${session.platform}:${session.channelId}`,
    bot: session.bot,
    channelId: session.channelId,
    messageId: session.messageId,
    timestamp: session.timestamp,
    send: (content) => session.send(content),
  }
  await sendContestOutputs(ctx, config, contests, [target], options)
}

export async function sendContestOutputsToAlertTargets(
  ctx: Context,
  config: Config,
  contests: Contest[],
  title: string,
): Promise<void> {
  const targets: ContestOutputTarget[] = []
  for (const alertTarget of config.alertTargets) {
    if (!alertTarget.enabled || !alertTarget.channelId) continue
    const bot = resolveAlertBot(ctx, alertTarget)
    if (!bot) {
      logInfo(
        ctx,
        config,
        `[WARN] 未找到提醒目标 Bot：${alertTarget.platform}${alertTarget.selfId ? `:${alertTarget.selfId}` : ''}。`,
      )
      continue
    }
    targets.push({
      kind: 'alert',
      platform: bot.platform,
      label: `${bot.platform}:${bot.selfId || alertTarget.selfId || '*'}:${alertTarget.channelId}`,
      bot,
      channelId: alertTarget.channelId,
      send: (content) => bot.sendMessage(alertTarget.channelId, content),
    })
  }

  await sendContestOutputs(ctx, config, contests, targets, { title })
}
