import type { Contest } from '../types'
import { formatDateTime, formatDuration, formatTimeUntil } from '../utils/time'

export function formatContestText(contest: Contest): string {
  return [
    `🏁 ${contest.name}`,
    `🏷️ 比赛平台：${contest.oj}`,
    `🕘 比赛时间：${formatDateTime(contest.startTime)}`,
    `⏱️ 比赛时长：${formatDuration(contest.duration)}`,
    `⏳ 距离开始：${formatTimeUntil(contest.startTime)}`,
    '--------------------',
    '',
  ].join('\n')
}

export function formatContestListText(contests: Contest[]): string {
  if (!contests.length) return '📅 算法比赛日程\n\n暂无比赛'
  return [
    `📅 算法比赛日程`,
    `📌 共 ${contests.length} 场比赛`,
    '',
    contests.map(formatContestText).join(''),
  ].join('\n')
}

export function getContestWindowText(contestWindowDays: number, contestTarget: string): string {
  if (contestWindowDays === 0) return `列出未来的${contestTarget}`
  return `列出${contestWindowDays}天内将要举办的${contestTarget}`
}
