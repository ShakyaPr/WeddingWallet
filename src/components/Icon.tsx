import type { CSSProperties } from 'react'

const paths = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  budget: 'M4 5h15a1 1 0 0 1 1 1v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12v2M20 11h-5v5h5M16 13.5h.01',
  payments: 'M7 3h10v18l-2.5-2-2.5 2-2.5-2L7 21ZM10 8h4m-4 4h4',
  vendors:
    'm3 9 2-6h14l2 6M4 10v11h16V10M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 21v-7h6v7',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7.87a4 4 0 0 1 0 7.75',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M21 21l-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  flower:
    'M12 9c-8-10-13 3-5 5-7 6 6 11 7 3 7 5 12-8 4-9 1-8-12-7-9 0M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  venue: 'm3 9 9-6 9 6M4 21h16M6 11v7m6-7v7m6-7v7',
  cake: 'M4 12h16v9H4ZM4 15c2 3 3-2 5 0s4-2 6 0 3-2 5 0M12 12V8m0-5c-3 3-2 5 0 5s3-2 0-5Z',
  gem: 'm3 8 4-5h10l4 5-9 13ZM3 8h18M7 3l5 18 5-18',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  music:
    'M9 18V5l12-2v13M9 8l12-2M9 18a3 3 0 1 1-3-3c1.66 0 3 1.34 3 3Zm12-2a3 3 0 1 1-3-3c1.66 0 3 1.34 3 3Z',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z',
  message:
    'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
  edit: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
  download: 'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6',
  history: 'M3 11a9 9 0 1 1 2.5 7M3 4v7h7m2-4v6l4 2',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
} as const

export type IconName = keyof typeof paths
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}
export function categoryIcon(name: string): IconName {
  if (/decor|flower/i.test(name)) return 'flower'
  if (/hall|venue/i.test(name)) return 'venue'
  if (/cake|food|cater/i.test(name)) return 'cake'
  if (/gold|jewel|ring/i.test(name)) return 'gem'
  if (/photo|video/i.test(name)) return 'camera'
  if (/music|band/i.test(name)) return 'music'
  return 'heart'
}
