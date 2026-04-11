import * as React from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, BarChart2 } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  className?: string
  icon?: React.ElementType
}

export function StatCard({ label, value, trend, trendUp, className, icon: Icon = BarChart2 }: StatCardProps) {
  return (
    <div 
      className={cn("rounded-xl p-6 border transition hover:border-purple-500/30", className)}
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--purple-dim)' }}
        >
          <Icon size={16} style={{ color: 'var(--accent)' }} />
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{value}</p>
      {trend && (
        <p className={cn("text-xs mt-2 flex items-center gap-1", trendUp ? "text-green-400" : "text-red-400")}>
          {trendUp && <TrendingUp size={12} />}
          {!trendUp && <TrendingUp size={12} className="rotate-180" />}
          {trend}
        </p>
      )}
    </div>
  )
}
