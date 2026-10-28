import type { SlideProps } from '../deck';
import { Slide, Reveal } from '../components';

/**
 * What `studioctl app upgrade v9` prints, in the shape of its report
 * (`internal/cmd/app/upgrade_report_render.go`: status, step, message, then a
 * verdict), with the steps grouped and worded for the audience
 * (`Upgrade/v8Tov9/V8Tov9Upgrade.cs`). Rewritten: packages and .NET version,
 * namespaces and the renamed APIs, text keys and layout files, PDF and
 * eFormidling as service tasks, and the service-owner grants in policy.xml
 * (ServiceOwnerPolicyMigrator). Reported as TODO: the removed task hooks
 * (RemovedTaskEventInterfaceDetector, ported by hand) and feedback steps behind
 * a service task (FeedbackAfterServiceTaskAdvisor).
 */
const REPORT: { status: 'OK' | 'TODO'; step: string; text: string }[] = [
  { status: 'OK', step: 'Prosjektfil', text: 'Altinn.App-pakkene er oppdatert til v9' },
  { status: 'OK', step: 'Dockerfile', text: 'Bygger med ny versjon av .NET' },
  { status: 'OK', step: 'Kode', text: 'Navn og navnerom er oppdatert' },
  { status: 'OK', step: 'Tekster', text: 'Tekstnøkler med nytt navn er oppdatert' },
  { status: 'OK', step: 'Sider', text: 'Sidefilene er oppdatert' },
  { status: 'OK', step: 'PDF', text: 'PDF lages i en egen tjenesteoppgave' },
  { status: 'OK', step: 'Tilganger', text: 'Tilgangene appen trenger, er lagt til' },
  { status: 'TODO', step: 'Prosessteg', text: 'Egen kode i prosessteg må skrives om' },
  { status: 'TODO', step: 'Ventesteg', text: 'Fjern ventesteg som ikke lenger trengs' },
];

/** What upgrading takes for an app developer: one command and its report. */
export default function OppgraderingSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      className="s-upgrade"
      kicker="Kom i gang"
      title="Slik oppgraderer du til v9"
      subtitle="Verktøyet gjør det meste. Oppgraderingen kjøres rett fra Studio, eller med studioctl."
    >
      <div className="s-fill">
        <div className="s-term">
          <p className="s-term__cmd">$ studioctl app upgrade v9</p>
          <div className="s-term__report">
            {REPORT.map((line, i) => (
              <Reveal key={line.step} show={step >= 1} offset={10} delay={i * 0.06}>
                <p className="s-term__row">
                  <span className={`s-term__status s-term__status--${line.status.toLowerCase()}`}>
                    {line.status}
                  </span>
                  <span className="s-term__step">{line.step}</span>
                  <span>{line.text}</span>
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal show={step >= 1} offset={10} delay={REPORT.length * 0.06}>
            <p className="s-term__verdict">
              ! Oppgraderingen er ferdig, men noen steg må følges opp for hånd.
            </p>
          </Reveal>
        </div>
      </div>
    </Slide>
  );
}
