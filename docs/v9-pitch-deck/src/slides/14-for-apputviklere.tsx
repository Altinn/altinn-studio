import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import type { IconName } from '../components';

const BULLETS: { icon: IconName; text: string }[] = [
  { icon: 'refresh', text: 'Noen navn i koden endrer seg.' },
  { icon: 'document', text: 'PDF og forsendelse blir egne tjenesteoppgaver.' },
  { icon: 'clock', text: 'Oppgaver som venter lenge, får et eget API.' },
];

const TERMINAL: { text: string; kind: 'cmd' | 'ok' | 'todo' }[] = [
  { text: 'studioctl app upgrade v9', kind: 'cmd' },
  { text: 'IProcessTaskEnd → IOnTaskEndingHandler', kind: 'ok' },
  { text: 'PDF-flagg → tjenesteoppgave i process.bpmn', kind: 'ok' },
  { text: 'eFormidling → ny registrering', kind: 'ok' },
  { text: 'Mottak av hendelser fjernet', kind: 'ok' },
  { text: 'policy.xml: rettigheter appen bruker selv', kind: 'todo' },
  { text: 'arkivoppgave: legg til gateway etter oppgaven', kind: 'todo' },
];

const PREFIX = { cmd: '$ ', ok: '✔ ', todo: 'TODO ' };

/** Slide 14 — what the engine costs an app developer. */
export default function ForApputviklereSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="split"
      splitRatio="820px 788px"
      kicker="For apputviklere"
      title="Hva betyr det for apputviklere"
      subtitle="BPMN-en din er den samme. Prosessmotoren er en del av plattformen — ikke noe du skrur på."
    >
      <div className="s-fill" style={{ justifyContent: 'flex-start', gap: 'var(--sp-4)' }}>
        <div className="s-bpmn">
          <svg viewBox="0 0 756 130" width={756} height={130} aria-hidden>
            <circle cx="30" cy="65" r="26" fill="none" stroke="#6b7a8f" strokeWidth="3" />
            <path d="M62 65 H 106" stroke="#6b7a8f" strokeWidth="3" />
            <path d="M100 58 L114 65 L100 72 Z" fill="#6b7a8f" />
            <rect
              x="120"
              y="25"
              width="220"
              height="80"
              rx="4"
              fill="#d2eafd"
              stroke="#0062b8"
              strokeWidth="3"
            />
            <text x="230" y="73" textAnchor="middle" fill="#1e2b3c" fontSize="26">
              Utfylling
            </text>
            <path d="M348 65 H 392" stroke="#6b7a8f" strokeWidth="3" />
            <path d="M386 58 L400 65 L386 72 Z" fill="#6b7a8f" />
            <rect
              x="406"
              y="25"
              width="220"
              height="80"
              rx="4"
              fill="#d2eafd"
              stroke="#0062b8"
              strokeWidth="3"
            />
            <text x="516" y="73" textAnchor="middle" fill="#1e2b3c" fontSize="26">
              Bekreftelse
            </text>
            <path d="M634 65 H 678" stroke="#6b7a8f" strokeWidth="3" />
            <path d="M672 58 L686 65 L672 72 Z" fill="#6b7a8f" />
            <circle cx="718" cy="65" r="26" fill="none" stroke="#6b7a8f" strokeWidth="6" />
          </svg>
          <p className="s-bpmn__caption">
            Prosessfilen i maloppsettet er byte for byte lik mellom v8 og v9.
          </p>
        </div>

        {BULLETS.map((bullet, i) => (
          <Reveal key={bullet.text} show={step >= 2} delay={i * 0.07}>
            <p className="s-bullet">
              <Icon name={bullet.icon} size={30} />
              {bullet.text}
            </p>
          </Reveal>
        ))}
      </div>

      <Reveal show={step >= 1} from="right">
        <div className="s-term">
          {TERMINAL.map((line) => (
            <p
              key={line.text}
              className={`s-term__line${line.kind === 'cmd' ? ' s-term__line--cmd' : ''}`}
            >
              <span className={line.kind === 'cmd' ? undefined : `s-term__${line.kind}`}>
                {PREFIX[line.kind]}
              </span>
              {line.text}
            </p>
          ))}
          <p className="s-term__note">
            Resten skriver den om selv. To punkter må gjøres for hånd.
          </p>
        </div>
      </Reveal>
    </Slide>
  );
}
