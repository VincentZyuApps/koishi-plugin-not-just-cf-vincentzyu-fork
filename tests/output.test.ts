import assert from 'node:assert/strict'
import test from 'node:test'
import type { Context, Session } from 'koishi'
import type { Config } from '../src/config'
import type { Contest } from '../src/types'
import {
  sendContestOutputsToAlertTargets,
  sendContestOutputsToSession,
} from '../src/services/output'

const contests: Contest[] = [{
  oj: 'Codeforces',
  name: 'Codeforces Round Test',
  startTime: Math.floor(Date.now() / 1000) + 3600,
  duration: 7200,
}]

function createConfig(overrides: Partial<Config> = {}): Config {
  return {
    outputFormats: [],
    enableQuote: false,
    enableWaitingHint: false,
    textMaxDisplay: 25,
    alertTargets: [],
    qqMarkdownMaxDisplay: 50,
    qqMarkdownKeyboardJson: '{"rows":[{"buttons":[{"render_data":{"label":"测试","style":0},"action":{"type":2,"permission":{"type":2},"data":"contest.all","enter":true}}]}]}',
    verboseConsoleLog: false,
    ...overrides,
  } as Config
}

function createContext(logs: string[], bots: any[] = []): Context {
  return {
    bots,
    logger: {
      info: (message: string) => logs.push(message),
    },
  } as unknown as Context
}

test('non-QQ command sessions silently skip QQ Markdown unless verbose logging is enabled', async () => {
  const logs: string[] = []
  const sent: any[] = []
  const ctx = createContext(logs)
  const session = {
    platform: 'onebot',
    channelId: 'group-1',
    bot: {},
    send: async (content: any) => {
      sent.push(content)
      return ['message-1']
    },
  } as unknown as Session
  const config = createConfig({ outputFormats: ['qqmarkdown_table'] })

  await sendContestOutputsToSession(ctx, session, config, contests, {
    title: '近期算法比赛日程',
    takumiWaitingText: 'Takumi waiting',
    puppeteerWaitingText: 'Puppeteer waiting',
  })
  assert.equal(sent.length, 0)
  assert.equal(logs.length, 0)

  config.verboseConsoleLog = true
  await sendContestOutputsToSession(ctx, session, config, contests, {
    title: '近期算法比赛日程',
    takumiWaitingText: 'Takumi waiting',
    puppeteerWaitingText: 'Puppeteer waiting',
  })
  assert.equal(sent.length, 0)
  assert.equal(logs.length, 1)
  assert.match(logs[0], /onebot.*qqmarkdown_table/)
})

test('scheduled outputs send compatible formats per platform without reply metadata', async () => {
  const logs: string[] = []
  const onebotMessages: any[] = []
  const qqMessages: any[] = []
  const qqRawMessages: any[] = []
  const onebot = {
    platform: 'onebot',
    selfId: 'onebot-1',
    sendMessage: async (_channelId: string, content: any) => {
      onebotMessages.push(content)
      return ['onebot-message']
    },
  }
  const qq = {
    platform: 'qq',
    selfId: 'qq-1',
    config: {},
    sendMessage: async (_channelId: string, content: any) => {
      qqMessages.push(content)
      return ['qq-message']
    },
    internal: {
      sendMessage: async (channelId: string, payload: any) => {
        qqRawMessages.push({ channelId, payload })
      },
    },
  }
  const ctx = createContext(logs, [onebot, qq])
  const config = createConfig({
    outputFormats: ['text', 'qqmarkdown_table'],
    alertTargets: [
      { platform: 'onebot', selfId: '', channelId: 'group-1', enabled: true },
      { platform: 'qq', selfId: '', channelId: 'group-2', enabled: true },
    ],
  })

  await sendContestOutputsToAlertTargets(ctx, config, contests, '主动推送测试')

  assert.equal(onebotMessages.length, 1)
  assert.match(onebotMessages[0], /主动推送测试/)
  assert.equal(qqMessages.length, 1)
  assert.match(qqMessages[0], /主动推送测试/)
  assert.equal(qqRawMessages.length, 1)
  assert.equal(qqRawMessages[0].channelId, 'group-2')
  assert.match(qqRawMessages[0].payload.markdown.content, /主动推送测试/)
  assert.equal(qqRawMessages[0].payload.msg_id, undefined)
  assert.equal(logs.length, 0)
})
