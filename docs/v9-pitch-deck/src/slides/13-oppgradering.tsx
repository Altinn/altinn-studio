import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import type { IconName } from '../components';

const BULLETS: { icon: IconName; text: string }[] = [
  { icon: 'terminal', text: 'Ett verktøy skriver om det det kan.' },
  { icon: 'flag', text: 'Det peker ut det du må gjøre selv.' },
  { icon: 'user', text: 'Vi hjelper deg med resten.' },
];

/**
 * What `studioctl app upgrade v9` does, in plain words. The three TODO lines
 * are the ones the tool reports rather than rewrites: permissions the app uses
 * itself, archive tasks, and feedback steps behind a service task (CHANGELOG).
 */
const TERMINAL: { text: string; kind: 'cmd' | 'ok' | 'todo' }[] = [
  { text: 'studioctl app upgrade v9', kind: 'cmd' },
  { text: 'Navn i koden er oppdatert', kind: 'ok' },
  { text: 'PDF og forsendelse er egne tjenesteoppgaver', kind: 'ok' },
  { text: 'Tilganger appen bruker selv', kind: 'todo' },
  { text: 'Arkivoppgaver: ett steg legges til', kind: 'todo' },
  { text: 'Ventesteg som ikke lenger trengs', kind: 'todo' },
];

const PREFIX = { cmd: '$ ', ok: '✔ ', todo: 'TODO ' };

/** What the upgrade costs an app developer. */
export default function OppgraderingSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="split"
      splitRatio="820px 788px"
      kicker="Backend · oppgradering"
      title="Hva koster oppgraderingen?"
      subtitle="Prosessen din er den samme. Prosessmotoren følger med plattformen — det er ingenting å skru på."
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
            Prosessfilen i malen er lik i v8 og v9.
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
            Verktøyet peker ut de tre punktene som gjøres for hånd.
          </p>
        </div>
      </Reveal>
    </Slide>
  );
}
