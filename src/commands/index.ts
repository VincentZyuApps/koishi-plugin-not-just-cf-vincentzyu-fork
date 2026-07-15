import type { Context } from 'koishi'
import type { Config } from '../config'
import { registerAllCommand } from './all'
import { registerListCommand } from './list'

export function registerCommands(ctx: Context, config: Config) {
  registerAllCommand(ctx, config)
  registerListCommand(ctx, config)
}
