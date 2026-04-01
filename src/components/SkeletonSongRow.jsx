export default function SkeletonSongRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded-full w-1/2" />
        <div className="h-3 bg-gray-200 rounded-full w-1/4" />
      </div>
      <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
    </div>
  )
}