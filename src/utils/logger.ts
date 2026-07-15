import type { Context } from 'koishi'
import type { Config } from '../config'

export function debug(ctx: Context, config: Config, message: string) {
  if (config.verboseConsoleLog) ctx.logger.info(message)
}
export function warn(ctx: Context, message: string) {
  ctx.logger.warn(message)
}
