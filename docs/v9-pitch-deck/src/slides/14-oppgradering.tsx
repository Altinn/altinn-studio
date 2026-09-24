import type { SlideProps } from '../deck';
import { Slide, Reveal } from '../components';

/**
 * What `studioctl app upgrade v9` does, in plain words, one line per group of
 * its steps (`Upgrade/v8Tov9/V8Tov9Upgrade.cs`). Rewritten: namespaces and the
 * renamed APIs, PDF and eFormidling as service tasks, and the service-owner
 * grants in policy.xml (ServiceOwnerPolicyMigrator). Reported as TODO: the
 * removed task hooks (RemovedTaskEventInterfaceDetector, ported by hand) and
 * feedback steps behind a service task (FeedbackAfterServiceTaskAdvisor).
 */
const TERMINAL: { text: string; kind: 'cmd' | 'ok' | 'todo' }[] = [
  { text: 'studioctl app upgrade v9', kind: 'cmd' },
  { text: 'Navn og navnerom i koden er oppdatert', kind: 'ok' },
  { text: 'PDF og forsendelse er egne tjenesteoppgaver', kind: 'ok' },
  { text: 'Tilgangene appen trenger, er lagt til', kind: 'ok' },
  { text: 'Egen kode i prosessteg må skrives om', kind: 'todo' },
  { text: 'Fjern ventesteg som ikke lenger trengs', kind: 'todo' },
];

const PREFIX = { cmd: '$ ', ok: '✔ ', todo: 'TODO ' };

/** What upgrading takes for an app developer. */
export default function OppgraderingSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="split"
      splitRatio="820px 788px"
      kicker="Backend"
      title="Slik oppgraderer du til v9"
      subtitle="Prosessen din er den samme. Oppgraderingen kjøres rett fra Studio, eller med studioctl."
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
            Verktøyet gjør resten selv og viser hva du må gjøre for hånd.
          </p>
        </div>
      </Reveal>
    </Slide>
  );
}
