import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { extname, join } from 'path'
import { pathToFileURL } from 'url'
import type { Context } from 'koishi'
import type {} from 'koishi-plugin-puppeteer'
import type { Contest, RenderOptions } from '../types'
import { formatDateTime, formatDuration, formatTimeUntil } from '../utils/time'
import { ojColors } from './theme'

interface ContestGroup {
  date: string
  label: string
  contests: Contest[]
}

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  weekday: 'long',
})

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getDateKey(seconds: number): string {
  return formatDateTime(seconds).slice(0, 10)
}

function groupContests(contests: Contest[]): ContestGroup[] {
  const groups = new Map<string, Contest[]>()
  for (const contest of contests) {
    const date = getDateKey(contest.startTime)
    const group = groups.get(date) || []
    group.push(contest)
    groups.set(date, group)
  }
  return Array.from(groups, ([date, items]) => ({
    date,
    label: weekdayFormatter.format(new Date(items[0].startTime * 1000)),
    contests: items,
  }))
}

function getFontFace(fontPath?: string): string {
  if (!fontPath || !existsSync(fontPath)) return ''
  const extension = extname(fontPath).toLowerCase()
  const format = extension === '.woff2'
    ? 'woff2'
    : extension === '.woff'
      ? 'woff'
      : extension === '.otf'
        ? 'opentype'
        : 'truetype'
  return `@font-face { font-family: "ContestCustom"; src: url("${pathToFileURL(fontPath).href}") format("${format}"); font-display: block; }`
}

function renderContestCard(contest: Contest): string {
  const dateTime = formatDateTime(contest.startTime)
  const color = ojColors[contest.oj] || '#667085'
  return `
    <article class="contest-card" style="--oj-color: ${color}">
      <div class="contest-main">
        <div class="contest-meta">
          <span class="oj-name">${escapeHtml(contest.oj)}</span>
          <span class="countdown">${escapeHtml(formatTimeUntil(contest.startTime))}后开始</span>
        </div>
        <div class="contest-name">${escapeHtml(contest.name)}</div>
      </div>
      <div class="contest-time">
        <strong>${escapeHtml(dateTime.slice(11, 16))}</strong>
        <span>${escapeHtml(formatDuration(contest.duration))}</span>
      </div>
    </article>`
}

function renderGroups(contests: Contest[]): string {
  if (!contests.length) {
    return '<div class="empty-state"><strong>近期暂无比赛</strong><span>可以稍后再来看看</span></div>'
  }
  return groupContests(contests).map((group) => `
    <section class="date-group">
      <header class="date-heading">
        <strong>${escapeHtml(group.date)}</strong>
        <span>${escapeHtml(group.label)} · ${group.contests.length} 场</span>
      </header>
      <div class="contest-list">${group.contests.map(renderContestCard).join('')}</div>
    </section>`).join('')
}

export function buildContestHtml(contests: Contest[], options: RenderOptions): string {
  const width = options.width || 960
  const dark = options.darkMode
  const title = options.title || '算法比赛日程'
  const generatedAt = options.generatedAt || Math.floor(Date.now() / 1000)
  const platforms = Array.from(new Set(contests.map((contest) => contest.oj)))
  const nearest = contests[0] ? formatTimeUntil(contests[0].startTime) : '--'
  const fontFace = getFontFace(options.fontPath)
  const platformBadges = platforms.map((platform) => {
    const color = ojColors[platform] || '#667085'
    return `<span class="platform-badge"><i style="background:${color}"></i>${escapeHtml(platform)}</span>`
  }).join('')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    ${fontFace}
    :root { color-scheme: ${dark ? 'dark' : 'light'}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: ${width}px;
      background: transparent;
      font-family: ${fontFace ? '"ContestCustom", ' : ''}"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
      letter-spacing: 0;
    }
    #contest-poster {
      width: ${width}px;
      padding: 28px;
      color: ${dark ? '#f5f7fa' : '#17202d'};
      background: ${dark ? '#161a20' : '#f2f4f7'};
    }
    .masthead {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      padding: 4px 2px 22px;
      border-bottom: 2px solid ${dark ? '#343a46' : '#d6dae1'};
    }
    .eyebrow { margin-bottom: 7px; color: ${dark ? '#99a3b3' : '#667085'}; font-size: 14px; font-weight: 700; }
    h1 { margin: 0; font-size: 36px; line-height: 1.2; font-weight: 900; }
    .generated { flex: none; color: ${dark ? '#99a3b3' : '#667085'}; font-size: 13px; text-align: right; }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border-bottom: 1px solid ${dark ? '#343a46' : '#d6dae1'};
    }
    .summary-item { padding: 18px 16px 16px; border-right: 1px solid ${dark ? '#343a46' : '#d6dae1'}; }
    .summary-item:first-child { padding-left: 2px; }
    .summary-item:last-child { border-right: 0; }
    .summary-item span { display: block; margin-bottom: 4px; color: ${dark ? '#99a3b3' : '#667085'}; font-size: 13px; font-weight: 700; }
    .summary-item strong { font-size: 24px; line-height: 1.2; }
    .platforms { display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 16px 2px 8px; }
    .platform-badge { display: inline-flex; align-items: center; gap: 7px; color: ${dark ? '#cbd2dc' : '#475467'}; font-size: 13px; font-weight: 700; }
    .platform-badge i { width: 8px; height: 8px; border-radius: 50%; }
    .date-group { margin-top: 20px; }
    .date-heading { display: flex; align-items: baseline; justify-content: space-between; padding: 0 2px 9px; }
    .date-heading strong { font-size: 19px; }
    .date-heading span { color: ${dark ? '#99a3b3' : '#667085'}; font-size: 13px; font-weight: 700; }
    .contest-list { display: flex; flex-direction: column; gap: 8px; }
    .contest-card {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 124px;
      min-height: 104px;
      overflow: hidden;
      border: 1px solid ${dark ? '#343a46' : '#d6dae1'};
      border-radius: 8px;
      background: ${dark ? '#222730' : '#ffffff'};
    }
    .contest-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 5px; background: var(--oj-color); }
    .contest-main { min-width: 0; padding: 16px 18px 15px 21px; }
    .contest-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .oj-name { color: var(--oj-color); font-size: 14px; font-weight: 900; }
    .countdown { color: ${dark ? '#99a3b3' : '#667085'}; font-size: 12px; font-weight: 700; }
    .contest-name { overflow-wrap: anywhere; font-size: 19px; line-height: 1.38; font-weight: 800; }
    .contest-time {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 5px;
      padding: 15px 17px;
      border-left: 1px solid ${dark ? '#343a46' : '#e2e5ea'};
      background: ${dark ? '#1d222a' : '#f8f9fb'};
    }
    .contest-time strong { font-size: 25px; }
    .contest-time span { color: ${dark ? '#99a3b3' : '#667085'}; font-size: 12px; font-weight: 700; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 20px; padding: 52px 20px; border: 1px solid ${dark ? '#343a46' : '#d6dae1'}; border-radius: 8px; background: ${dark ? '#222730' : '#ffffff'}; }
    .empty-state strong { font-size: 22px; }
    .empty-state span { color: ${dark ? '#99a3b3' : '#667085'}; font-size: 14px; }
    .footer { display: flex; justify-content: space-between; margin-top: 22px; padding: 12px 2px 2px; border-top: 1px solid ${dark ? '#343a46' : '#d6dae1'}; color: ${dark ? '#7f8998' : '#7a8494'}; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <main id="contest-poster">
    <header class="masthead">
      <div><div class="eyebrow">CONTEST CALENDAR</div><h1>${escapeHtml(title)}</h1></div>
      <div class="generated">Asia/Shanghai<br>${escapeHtml(formatDateTime(generatedAt))}</div>
    </header>
    <section class="summary">
      <div class="summary-item"><span>比赛总数</span><strong>${contests.length}</strong></div>
      <div class="summary-item"><span>覆盖平台</span><strong>${platforms.length}</strong></div>
      <div class="summary-item"><span>最近开赛</span><strong>${escapeHtml(nearest)}</strong></div>
    </section>
    ${platformBadges ? `<div class="platforms">${platformBadges}</div>` : ''}
    ${renderGroups(contests)}
    <footer class="footer"><span>not-just-cf</span><span>Puppeteer HTML renderer</span></footer>
  </main>
</body>
</html>`
}

async function waitForStableLayout(page: any, selector: string) {
  await page.evaluate(async (targetSelector: string) => {
    const fonts = (document as any).fonts
    if (fonts?.ready) await fonts.ready
    const element = document.querySelector(targetSelector)
    if (!element) return

    let previous = ''
    let stableFrames = 0
    for (let index = 0; index < 12 && stableFrames < 2; index++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const rect = element.getBoundingClientRect()
      const current = `${rect.width},${rect.height},${element.scrollWidth},${element.scrollHeight}`
      if (current === previous) stableFrames++
      else {
        previous = current
        stableFrames = 0
      }
    }
  }, selector)
}

export async function renderContestPuppeteerImage(
  ctx: Context,
  contests: Contest[],
  options: RenderOptions,
): Promise<Buffer> {
  if (!ctx.puppeteer) {
    throw new Error('Puppeteer 服务未启用，请安装并启用 koishi-plugin-puppeteer。')
  }

  const width = options.width || 960
  const renderDir = join(ctx.baseDir, 'data', 'not-just-cf')
  const htmlPath = join(renderDir, `render-${randomUUID()}.html`)
  await mkdir(renderDir, { recursive: true })
  await writeFile(htmlPath, buildContestHtml(contests, options), 'utf8')
  let page: Awaited<ReturnType<typeof ctx.puppeteer.page>> | undefined
  try {
    page = await ctx.puppeteer.page()
    page.on('console', (message) => ctx.logger.debug(`Puppeteer console: ${message.text()}`))
    page.on('pageerror', (error) => ctx.logger.error(`Puppeteer page error: ${error.message}`))
    await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 })
    ctx.logger.debug('Puppeteer 比赛日程：开始加载本地 HTML。')
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 15000 })
    ctx.logger.debug('Puppeteer 比赛日程：本地 HTML 加载完成。')
    await page.waitForSelector('#contest-poster', { timeout: 5000 })
    ctx.logger.debug('Puppeteer 比赛日程：开始等待字体和布局稳定。')
    await waitForStableLayout(page, '#contest-poster')
    ctx.logger.debug('Puppeteer 比赛日程：字体和布局已稳定。')
    const element = await page.$('#contest-poster')
    if (!element) throw new Error('找不到比赛日程渲染容器 #contest-poster。')
    ctx.logger.debug('Puppeteer 比赛日程：开始截图。')
    const screenshot = await element.screenshot({ type: 'png' })
    ctx.logger.debug('Puppeteer 比赛日程：截图完成。')
    return Buffer.from(screenshot)
  } finally {
    if (page) await page.close()
    await unlink(htmlPath).catch((error) => {
      ctx.logger.debug(`删除 Puppeteer 临时 HTML 失败：${error instanceof Error ? error.message : error}`)
    })
  }
}
