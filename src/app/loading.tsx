export default function Loading() {
  return (
    <main className="container-app space-y-4 pt-10">
      <div className="skeleton h-8 w-40 rounded-lg" />
      <div className="skeleton h-[280px] w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton aspect-[4/5] rounded-2xl" />
        <div className="skeleton aspect-[4/5] rounded-2xl" />
      </div>
    </main>
  )
}
