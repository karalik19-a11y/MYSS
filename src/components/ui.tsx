'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Появление блока при входе во вьюпорт. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="display text-[22px] text-bone-50">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] px-6 py-12 text-center">
      <p className="display text-[18px] text-bone-100">{title}</p>
      <p className="mx-auto mt-2 max-w-[38ch] text-[13.5px] leading-relaxed text-bone-400">
        {description}
      </p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Не получилось загрузить"
      description="Попробуй ещё раз — возможно, пропала связь."
      action={
        onRetry && (
          <button onClick={onRetry} className="tap rounded-full bg-bone-50 px-5 text-[13px] font-medium text-ink-950">
            Повторить
          </button>
        )
      }
    />
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

export function Chip({
  active,
  children,
  onClick,
  as = 'button',
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  as?: 'button' | 'span'
}) {
  const cls = `whitespace-nowrap rounded-full border px-3.5 py-2 text-[12.5px] transition-colors duration-250 ${
    active
      ? 'border-transparent bg-bone-50 text-ink-950'
      : 'border-[var(--line)] bg-transparent text-bone-400'
  }`
  if (as === 'span') return <span className={cls}>{children}</span>
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
