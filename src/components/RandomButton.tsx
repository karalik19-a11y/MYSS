'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { api, haptic } from '@/lib/telegram'
import { IconShuffle } from './Icons'

export function RandomButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const reduce = useReducedMotion()

  async function pick() {
    if (loading) return
    setLoading(true)
    haptic.tap()
    try {
      const person = await api<{ slug: string }>('/api/random')
      router.push(`/people/${person.slug}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={pick}
      disabled={loading}
      className="tap justify-start gap-2.5 rounded-2xl border border-[var(--line)] px-4 text-[13.5px] text-bone-200 disabled:opacity-70"
    >
      <motion.span
        animate={loading && !reduce ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: 'linear' }}
        className="inline-flex text-bone-400"
      >
        <IconShuffle size={17} />
      </motion.span>
      {loading ? 'Ищем' : 'Покажи кого-нибудь'}
    </button>
  )
}
