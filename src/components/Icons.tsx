interface IconProps {
  className?: string
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconHome = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
)

export const IconPeople = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c0-3.1 2.5-5.5 5.5-5.5s5.5 2.4 5.5 5.5" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 6" />
    <path d="M17.5 14.9c1.8.8 3 2.6 3 5.1" />
  </svg>
)

export const IconDay = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const IconSaved = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M6 3.5h12v17l-6-4.2-6 4.2z" />
  </svg>
)

export const IconProfile = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20.5c0-3.7 3.2-6.5 7.2-6.5s7.2 2.8 7.2 6.5" />
  </svg>
)

export const IconSearch = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4 4" />
  </svg>
)

export const IconArrow = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)

export const IconBack = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </svg>
)

export const IconCheck = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
)

export const IconPlus = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconClose = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

export const IconShuffle = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6h3.5c1.5 0 2.5.8 3.5 2.5l2 3.5c1 1.7 2 2.5 3.5 2.5H20" />
    <path d="M4 18h3.5c1.5 0 2.5-.8 3.5-2.5" />
    <path d="M14.5 8.5 20 6l-5.5-2.5M17 12.5l3 1.5-3 1.5" />
  </svg>
)

export const IconShare = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 15V4" />
    <path d="m8 7.5 4-3.5 4 3.5" />
    <path d="M5 13v6.5h14V13" />
  </svg>
)

export const IconSource = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" />
    <path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" />
  </svg>
)

export const IconCompare = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 4v16" />
    <path d="M7.5 8 4 12l3.5 4" />
    <path d="M16.5 8 20 12l-3.5 4" />
  </svg>
)

export const IconFilter = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </svg>
)

export const IconSpark = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.2l-1.8-5.6L4.5 10.8 10.2 9z" />
  </svg>
)
