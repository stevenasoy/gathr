import { useLocation } from 'react-router-dom'
import Footer from '../components/Footer'

interface LegalSection {
  h: string
  p: string
}
interface LegalContent {
  eyebrow: string
  title: string
  updated: string
  sections: LegalSection[]
}

const CONTENT: Record<string, LegalContent> = {
  '/privacy': {
    eyebrow: 'Privacy',
    title: 'Privacy policy',
    updated: 'Last updated June 1, 2026',
    sections: [
      { h: 'What we collect', p: 'We collect the information you give us when you create an account, book a venue, or list a space — name, email, phone, payment info, and the messages you send through Gathr. We also collect basic device data (IP, browser, referrer) to keep the platform secure.' },
      { h: 'How we use it', p: 'To match guests with venues, process bookings, prevent fraud, and improve the product. We do not sell your personal data to third parties. Ever.' },
      { h: 'What hosts can see', p: 'When you request to book, the host receives your name, profile photo, message, and the requested date, hours, and guest count. They do not see your email, phone, or payment details.' },
      { h: 'Cookies', p: 'We use first-party cookies for sign-in and basic analytics. You can clear them anytime from your browser settings. We do not use third-party advertising cookies.' },
      { h: 'Your rights', p: 'Email privacy@gathr.ph to access, correct, or delete your data. We respond within 30 days, in line with the Data Privacy Act of 2012.' },
    ],
  },
  '/terms': {
    eyebrow: 'Terms',
    title: 'Terms of service',
    updated: 'Last updated June 1, 2026',
    sections: [
      { h: 'Using Gathr', p: 'Gathr is a marketplace that connects venue hosts with guests. We are not the venue. The host is the operator of record and is responsible for what happens at their space.' },
      { h: 'Booking and payment', p: 'When you request a booking, you authorize Gathr to charge your payment method if the host confirms. Service fees are non-refundable except in cases of host cancellation.' },
      { h: 'Cancellations', p: 'Each venue sets its own cancellation policy. Read it before you book. If a host cancels on you within 14 days of your event, Gathr will help relocate you or refund in full.' },
      { h: 'Host responsibilities', p: 'Hosts must accurately describe their space, honor confirmed bookings, and maintain a safe environment. Repeated violations may result in removal from the platform.' },
      { h: 'Account termination', p: 'We may suspend or terminate accounts that violate these terms or harm the community. You can delete your account anytime from settings.' },
    ],
  },
}

export default function Legal() {
  const { pathname } = useLocation()
  const data = CONTENT[pathname] || CONTENT['/terms']

  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">{data.eyebrow}</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">{data.title}</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">{data.updated}</p>
          </div>
        </section>

        <div className="wrap page-body">
          <article className="max-w-[720px]">
            {data.sections.map((s) => (
              <section className="mb-[30px]" key={s.h}>
                <h2 className="text-[19px] font-bold mb-2">{s.h}</h2>
                <p className="text-ink-soft text-[15.5px] leading-relaxed m-0">{s.p}</p>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
