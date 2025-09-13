import { ReactNode } from 'react'


export default function StatCard({ title, value, footer, icon }: { title: string; value: ReactNode; footer?: ReactNode; icon?: ReactNode }) {
return (
<div className="card-outline p-5 card-outline-hover">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
        </div>
        {icon && (
          <div className="rounded-xl border border-gray-200 bg-white p-2">
            {icon}
          </div>
        )}
      </div>
      {footer && <div className="mt-3 text-xs text-gray-500">{footer}</div>}
    </div>
)
}