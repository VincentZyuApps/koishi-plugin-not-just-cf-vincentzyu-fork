import type { Bot, Context } from 'koishi'
import type { AlertTarget } from '../types'

export function resolveAlertBot(ctx: Context, target: AlertTarget): Bot | null {
  if (!target.platform) return null
  if (target.selfId) return ctx.bots[`${target.platform}:${target.selfId}`] || null
  return ctx.bots.find((bot) => bot.platform === target.platform) || null
}
