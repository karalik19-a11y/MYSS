'use client'

import { useEffect } from 'react'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Технические детали остаются в логах сервера, пользователю их не показываем (§50).
  }, [])

  return (
    <main className="container-app flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">Ошибка</p>
      <h1 className="display mt-4 text-[26px] text-bone-50">
        Не получилось загрузить страницу
      </h1>
      <p className="mt-3 max-w-[34ch] text-[13.5px] leading-relaxed text-bone-400">
        Попробуй ещё раз — возможно, пропала связь.
      </p>
      <button
        onClick={reset}
        className="tap mt-8 rounded-full bg-bone-50 px-6 text-[13.5px] font-medium text-ink-950"
      >
        Попробовать ещё раз
      </button>
    </main>
  )
}
