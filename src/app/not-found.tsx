import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container-app flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">Страница не найдена</p>
      <h1 className="display mt-4 text-[28px] text-bone-50">Здесь ничего нет</h1>
      <p className="mt-3 max-w-[34ch] text-[13.5px] leading-relaxed text-bone-400">
        Возможно, ссылка устарела или человек пока не опубликован.
      </p>
      <Link
        href="/people"
        className="tap mt-8 rounded-full bg-bone-50 px-6 text-[13.5px] font-medium text-ink-950"
      >
        К библиотеке
      </Link>
    </main>
  )
}
