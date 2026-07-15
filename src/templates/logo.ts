import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

interface PlatformPresentationConfig {
  fileName: string
  label: string
  darkFilter: string
  lightFilter: string
  logoScale?: number
}

export interface PlatformPresentation {
  label: string
  logoDataUrl: string | null
  filter: string
  logoScale: number
}

const PLATFORM_PRESENTATION: Record<string, PlatformPresentationConfig> = {
  Codeforces: {
    fileName: 'logo.CODEFORCES.png',
    label: 'Codeforces',
    darkFilter: 'contrast(1.08) saturate(1.06)',
    lightFilter: 'contrast(1.08)',
  },
  NowCoder: {
    fileName: 'logo.牛客.png',
    label: 'NowCoder / 牛客',
    darkFilter: 'brightness(1.1) saturate(1.08)',
    lightFilter: 'contrast(1.06)',
    logoScale: 1.05,
  },
  LeetCode: {
    fileName: 'logo.LeetCode.png',
    label: 'LeetCode / 力扣',
    darkFilter: 'brightness(1.12) contrast(1.05)',
    lightFilter: 'contrast(1.08)',
  },
  Luogu: {
    fileName: 'logo.洛谷.png',
    label: 'Luogu / 洛谷',
    darkFilter: 'brightness(1.12) saturate(1.12)',
    lightFilter: 'contrast(1.03) saturate(1.08)',
  },
  AtCoder: {
    fileName: 'logo.AtCoder.png',
    label: 'AtCoder',
    darkFilter: 'invert(1) grayscale(1) brightness(1.15)',
    lightFilter: 'grayscale(1) contrast(1.12)',
  },
}

const logoCache = new Map<string, string | null>()

function resolveLogoPath(fileName: string): string | null {
  const candidates = [
    resolve(__dirname, '../../assets/logo', fileName),
    resolve(__dirname, '../assets/logo', fileName),
  ]
  return candidates.find((candidate) => existsSync(candidate)) || null
}

export function getPlatformLogoDataUrl(platform: string): string | null {
  if (logoCache.has(platform)) return logoCache.get(platform) || null

  const fileName = PLATFORM_PRESENTATION[platform]?.fileName
  const filePath = fileName ? resolveLogoPath(fileName) : null
  const dataUrl = filePath
    ? `data:image/png;base64,${readFileSync(filePath).toString('base64')}`
    : null
  logoCache.set(platform, dataUrl)
  return dataUrl
}

export function getPlatformPresentation(platform: string, darkMode: boolean): PlatformPresentation {
  const presentation = PLATFORM_PRESENTATION[platform]
  return {
    label: presentation?.label || platform,
    logoDataUrl: getPlatformLogoDataUrl(platform),
    filter: presentation
      ? (darkMode ? presentation.darkFilter : presentation.lightFilter)
      : 'none',
    logoScale: presentation?.logoScale ?? 1,
  }
}
