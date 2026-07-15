import { Schema } from 'koishi'
import { OJ_LIST, OJ_SCHEMA } from './constants/oj'
import type { AlertTarget, OjName, OutputFormat } from './types'
import { stringifyCompact, DEFAULT_KEYBOARD_ROWS } from './qq'

export const OUTPUT_FORMAT = {
  TEXT: 'text',
  IMAGE: 'image',
  PUPPETEER_IMAGE: 'puppeteer_image',
  QQ_MARKDOWN_STYLE: 'qqmarkdown_style',
  QQ_MARKDOWN_TABLE: 'qqmarkdown_table',
} as const

export interface Config {
  // ===== 消息设置 =====
  enableQuote: boolean
  enableWaitingHint: boolean

  // ===== 基础命令配置 =====
  commandNameAll: string
  commandNameList: string

  // ===== 比赛数据配置 =====
  enabledOjs: OjName[]
  contestWindowDays: number
  githubProxy: string

  // ===== 图片输出配置 =====
  outputFormats: OutputFormat[]
  imageWidth: number
  imageDarkMode: boolean
  imageFontPath: string
  showRenderInfo: boolean

  // ===== 定时提醒配置 =====
  alertEnabled: boolean
  alertCronExpression: string
  alertBeforeEnabled: boolean
  alertBeforeMinutes: number
  alertTargets: AlertTarget[]

  // ===== QQ 官方 Bot 配置 =====
  qqMarkdownMaxDisplay: number
  qqMarkdownKeyboardJson: string

  // ===== 调试配置 =====
  verboseConsoleLog: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  // ===== 消息设置 =====
  Schema.object({
    enableQuote: Schema
      .boolean()
      .default(true)
      .description('💬 回复时引用触发消息'),
    enableWaitingHint: Schema
      .boolean()
      .default(true)
      .description('⏳ 图片渲染时发送等待提示'),
  }).description('💬 消息设置'),

  // ===== 基础命令配置 =====
  Schema.object({
    commandNameAll: Schema
      .string()
      .default('contest.all')
      .description('📋 全部比赛命令，例如：<code>contest.all</code>'),
    commandNameList: Schema
      .string()
      .default('contest.list')
      .description('🔎 指定平台比赛命令，例如：<code>contest.list cf</code>'),
  }).description('📌 基础命令配置'),

  // ===== 比赛数据配置 =====
  Schema.object({
    enabledOjs: Schema.array(Schema.union(OJ_SCHEMA))
      .role('checkbox')
      .default(OJ_LIST)
      .description('🏁 启用的比赛平台'),
    contestWindowDays: Schema.number()
      .min(0)
      .default(3)
      .description('📅 获取未来几天内的比赛，0 表示返回所有未来比赛'),
    githubProxy: Schema.string()
      .role('githubProxy')
      .default('https://gh-proxy.com/')
      .description('🌐 GitHub 代理，为空表示不使用'),
  }).description('🏁 比赛数据配置'),

  // ===== 图片输出配置 =====
  Schema.object({
    outputFormats: Schema
      .array(Schema.union([
        Schema.const(OUTPUT_FORMAT.TEXT).description('📄【text】文字模式：发送带 emoji 的文本比赛列表'),
        Schema.const(OUTPUT_FORMAT.IMAGE).description('🖼️【image】图片模式：发送 Takumi WASM 渲染图片'),
        Schema.const(OUTPUT_FORMAT.PUPPETEER_IMAGE).description('🎨【puppeteer_image】HTML 图片模式：使用 Puppeteer + LXGW 文楷渲染比赛日程'),
        Schema.const(OUTPUT_FORMAT.QQ_MARKDOWN_STYLE).description('🐧【qqmarkdown_style】QQ Markdown 格式风格：仅支持 QQ 官方 Bot，发送引用块详情 + 按钮'),
        Schema.const(OUTPUT_FORMAT.QQ_MARKDOWN_TABLE).description('📊【qqmarkdown_table】QQ Markdown 表格风格：仅支持 QQ 官方 Bot，发送 Markdown 表格 + 按钮'),
      ]))
      .role('checkbox')
      .default([OUTPUT_FORMAT.IMAGE])
      .description('📤 选择默认输出格式，可多选并按插件内置顺序发送'),
    imageWidth: Schema
      .number()
      .min(600).max(1600).step(10)
      .default(960)
      .description('📐 Takumi 图片宽度'),
    imageDarkMode: Schema
      .boolean()
      .default(true)
      .description('🌙 图片默认深色模式'),
    imageFontPath: Schema
      .string()
      .default('')
      .description('🔤 Takumi 自定义字体路径；留空时自动下载并使用 LXGW 文楷'),
    showRenderInfo: Schema
      .boolean()
      .default(false)
      .description('⏱️ 发送图片后附加渲染耗时'),
  }).description('🖼️ 图片输出配置'),

  // ===== 定时提醒配置 =====
  Schema.object({
    alertEnabled: Schema.boolean().default(false).description('📣 启用 Cron 定时比赛提醒，需要启用 Koishi cron 服务'),
    alertCronExpression: Schema.string().default('0 9 * * *').description('🕘 定时提醒 Cron 表达式，例如 <code>0 9 * * *</code> 表示每天 09:00'),
    alertBeforeEnabled: Schema.boolean().default(false).description('⏰ 启用赛前提醒'),
    alertBeforeMinutes: Schema.number().min(1).max(180).default(30).description('⏰ 赛前多少分钟提醒'),
    alertTargets: Schema.array(Schema.object({
      platform: Schema.string().default('onebot').description('🤖 Bot 平台，例如 onebot / qq'),
      selfId: Schema.string().default('').description('🆔 Bot 账号 selfId；留空时自动使用该平台下找到的第一个 Bot'),
      channelId: Schema.string().required().description('📨 群号或频道 ID'),
      enabled: Schema.boolean().default(true).description('✅ 是否启用此提醒目标'),
    }))
      .role('table')
      .default([
        {
          platform: 'onebot',
          selfId: '',
          channelId: '1085190201',
          enabled: true,
        },
      ])
      .description('📨 提醒发送目标列表'),
  }).description('📣 定时提醒配置'),

  // ===== QQ 官方 Bot 配置 =====
  Schema.object({
    qqMarkdownMaxDisplay: Schema
      .number()
      .min(1).max(50).step(1)
      .default(8)
      .description('📊 QQ Markdown 最多展开的比赛数量，格式风格和表格风格共用'),
    qqMarkdownKeyboardJson: Schema.string()
      .role('textarea', { rows: [5, 10] })
      .default(stringifyCompact(DEFAULT_KEYBOARD_ROWS))
      .description('⌨️ QQ Markdown 按钮 JSON，支持 <code>${commandNameAll}</code> <code>${commandNameList}</code>'),
  }).description('🐧 QQ 官方 Bot 配置'),

  // ===== 调试配置 =====
  Schema.object({
    verboseConsoleLog: Schema.boolean().default(false).description('🐛 输出详细调试日志'),
  }).description('🐛 调试配置'),
])
