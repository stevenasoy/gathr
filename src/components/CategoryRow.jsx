import { categoryIcon } from '../lib/icons'
import { CATEGORIES } from '../data/categories'

export default function CategoryRow({ active, onChange }) {
  return (
    <div className="cats">
      <div className="wrap cats-row">
        {CATEGORIES.map((c) => {
          const Icon = categoryIcon(c.icon)
          return (
            <button
              key={c.id}
              className={'cat' + (active === c.id ? ' on' : '')}
              onClick={() => onChange(c.id)}
              aria-pressed={active === c.id}
            >
              <Icon strokeWidth={1.6} />
              <span>{c.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
