import { categoryIcon } from '../lib/icons'
import { CATEGORIES } from '../data/categories'

export default function CategoryRow({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div className="relative z-40 bg-surface border-b border-line">
      <div className="max-w-wrap mx-auto px-10 flex gap-1 overflow-x-auto py-3.5 pb-3 scrollbar-hide">
        {CATEGORIES.map((c) => {
          const Icon = categoryIcon(c.icon)
          const isActive = active === c.id
          return (
            <button
              key={c.id}
              className={[
                'flex flex-col items-center gap-2 py-2 px-3.5 pb-3 min-w-[76px] border-b-2 transition-colors duration-150',
                isActive
                  ? 'text-ink border-b-ink'
                  : 'text-ink-faint border-transparent hover:text-ink',
              ].join(' ')}
              onClick={() => onChange(c.id)}
              aria-pressed={isActive}
            >
              <Icon strokeWidth={1.6} />
              <span className="text-xs font-semibold whitespace-nowrap">{c.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
