export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">

      <div className="aspect-square bg-gray-200" />

      <div className="p-4 space-y-3">

        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded-full w-3/4" />
          <div className="h-3 bg-gray-200 rounded-full w-1/2" />
        </div>

        <div className="space-y-1.5">
          <div className="h-3 bg-gray-200 rounded-full w-full" />
          <div className="h-3 bg-gray-200 rounded-full w-2/3" />
        </div>

        <div className="h-10 bg-gray-200 rounded-xl w-full" />
      </div>
    </div>
  )
}