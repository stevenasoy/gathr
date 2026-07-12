import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

type Mode = 'signin' | 'signup'

const TAGLINE: Record<Mode, { eyebrow: string; headline: string }> = {
  signin: {
    eyebrow: 'Welcome back',
    headline: 'Pick up where you left off.',
  },
  signup: {
    eyebrow: 'Join Gathr',
    headline: 'Venues for every gathering.',
  },
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-outfit font-extrabold text-2xl tracking-[-0.03em] text-ink">
      <span className="w-9 h-9 rounded-xl grid place-items-center text-[22px] font-bold font-display italic bg-brand text-white">g</span>
      Gathr
    </Link>
  )
}

export default function AuthLayout({ mode, children }: { mode: Mode; children: ReactNode }) {
  const t = TAGLINE[mode]
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }
  return (
    <main className="h-[100dvh] overflow-y-auto bg-canvas">
      {/* Soft brand wash — subtle, never competes with the form */}
      <div className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-brand/5 blur-3xl" />
      </div>

      <button
        type="button"
        onClick={goBack}
        className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink transition-colors duration-150 z-[2]"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="min-h-full flex flex-col items-center justify-center px-5 py-6 sm:py-8">
      <div className="w-full max-w-[440px] flex flex-col items-center text-center">
        <Logo />

        <span className="mt-5 inline-block text-[11px] font-bold tracking-[0.16em] uppercase text-brand">{t.eyebrow}</span>
        <h1 className="font-display italic text-[clamp(24px,4.5vw,32px)] leading-[1.1] m-0 mt-2 text-ink max-w-[360px]">{t.headline}</h1>

        <div className="w-full mt-6 bg-white border border-line-strong rounded-2xl shadow-card p-5 sm:p-7 text-left">
          {children}
        </div>

        <p className="mt-5 text-ink-faint text-[12.5px]">
          Book extraordinary spaces across the Philippines · <span className="font-display italic">₱</span> PHP
        </p>
      </div>
      </div>
    </main>
  )
}