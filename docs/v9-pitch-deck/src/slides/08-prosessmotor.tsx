import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import { ArrowDefs, StepRow, Wire } from './_kit';

/** Slide 8 — the engine, drawn: app <-> engine <-> steps in Postgres. */
export default function ProsessmotorSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="Med prosessmotor · v9"
      title="En motor for prosessen"
      subtitle="v9 flytter arbeidet mellom BPMN-oppgavene ut av forespørselen og inn i en egen prosessmotor med database."
    >
      <div className="s-arch">
        <svg className="s-arch__svg" viewBox="0 0 1656 520" width={1656} height={520} aria-hidden>
          <ArrowDefs />
          <Wire d="M360 240 H 652" tone="blue" show={step >= 1} />
          <Wire d="M660 340 H 368" tone="teal" show={step >= 2} />
          <Wire d="M1060 260 H 1192" tone="teal" show={step >= 3} />
        </svg>

        <div className="s-unit s-unit--app" style={{ left: 0, top: 160, width: 360, height: 240 }}>
          <Icon name="user" size={44} />
          <span className="s-unit__title">Altinn-app</span>
          <span className="s-unit__sub">Brukeren klikker «Send inn»</span>
        </div>

        <Reveal show={step >= 1} keepSpace={false}>
          <span className="s-arrowlabel" style={{ left: 510, top: 186, transform: 'translateX(-50%)' }}>
            Melder inn
          </span>
        </Reveal>

        <Reveal show={step >= 2} keepSpace={false}>
          <span className="s-arrowlabel" style={{ left: 510, top: 286, transform: 'translateX(-50%)' }}>
            Svar per steg
          </span>
        </Reveal>

        <Reveal show={step >= 1} keepSpace={false}>
          <div
            className="s-unit s-unit--engine"
            style={{ left: 660, top: 160, width: 400, height: 240 }}
          >
            <Icon name="server" size={44} />
            <span className="s-unit__title">Prosessmotor</span>
            <span className="s-unit__sub">Kjører stegene i rekkefølge</span>
          </div>
        </Reveal>

        <Reveal show={step >= 3} keepSpace={false}>
          <div className="s-db" style={{ left: 1200, top: 96, width: 456 }}>
            <p className="s-db__head">
              <Icon name="database" size={24} />
              Postgres · hvert steg
            </p>
            <StepRow label="1 · Avslutt oppgave" state="Fullført" tone="ok" />
            <StepRow label="2 · Lag PDF" state="Fullført" tone="ok" />
            <StepRow label="3 · Send forsendelse" state="Kjører" tone="run" />
            <StepRow label="4 · Registrer hendelser" state="I kø" tone="idle" />
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}
