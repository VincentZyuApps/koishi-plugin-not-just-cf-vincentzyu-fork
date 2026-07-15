import type { Bot, Context } from 'koishi'
import type { Config } from '../config'
import type { AlertTarget } from '../types'

export function resolveAlertBot(ctx: Context, target: AlertTarget): Bot | null {
  if (!target.platform) return null
  if (target.selfId) return ctx.bots[`${target.platform}:${target.selfId}`] || null
  return ctx.bots.find((bot) => bot.platform === target.platform) || null
}

export async function sendToAlertTargets(ctx: Context, config: Config, content: any): Promise<void> {
  for (const target of config.alertTargets) {
    if (!target.enabled || !target.channelId) continue
    const bot = resolveAlertBot(ctx, target)
    if (!bot) {
      ctx.logger.warn(`not-just-cf alert bot not found: ${target.platform}${target.selfId ? `:${target.selfId}` : ''}`)
      continue
    }
    await bot.sendMessage(target.channelId, content)
  }
}
