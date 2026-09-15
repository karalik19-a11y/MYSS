'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { haptic } from '@/lib/telegram'
import { IconDay, IconHome, IconPeople, IconProfile, IconSaved } from './Icons'

const items = [
  { href: '/', label: 'Главная', Icon: IconHome },
  { href: '/people', label: 'Люди', Icon: IconPeople },
  { href: '/day', label: 'Мой день', Icon: IconDay },
  { href: '/saved', label: 'Сохранённое', Icon: IconSaved },
  { href: '/profile', label: 'Профиль', Icon: IconProfile },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[#0a0c11]/95 backdrop-blur-xl"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="mx-auto flex max-w-[720px] items-stretch justify-between px-2">
        {items.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                onClick={() => haptic.select()}
                aria-current={active ? 'page' : undefined}
                className="flex h-[64px] flex-col items-center justify-center gap-1.5 transition-colors duration-200"
              >
                <Icon
                  size={21}
                  className={active ? 'text-[var(--accent)]' : 'text-bone-400'}
                />
                <span
                  className={`text-[10px] leading-none tracking-wide ${
                    active ? 'text-bone-50' : 'text-bone-400'
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
