import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import { Chain } from './_kit';

const BEFORE = ['done', 'done', 'done', 'done', 'idle', 'idle', 'idle'] as const;
const AFTER = ['done', 'done', 'done', 'done', 'ghost', 'ghost', 'ghost'] as const;

/** Slide 4 — the pod dies between the side effects and the process state. */
export default function MidtveisSlide({ step }: SlideProps) {
  const crashed = step >= 1;

  return (
    <Slide
      variant="full"
      kicker="I dag · v8"
      title="Når det ryker midtveis"
      subtitle="Ny versjon rulles ut, poden stoppes. PDF-en er laget og lagret. Prosessen står igjen på forrige oppgave. Brukeren ser en feilmelding."
    >
      <div className="s-fill">
        <Chain
          states={[...(crashed ? AFTER : BEFORE)]}
          crashAfter={crashed ? 4 : undefined}
          crashLabel="Poden dør"
        />

        <div className="s-outcomes">
          <Reveal show={step >= 2} delay={0}>
            <div className="s-outcome s-outcome--ok">
              <span className="s-outcome__icon">
                <Icon name="document" size={30} />
              </span>
              <span>
                PDF-en ligger lagret
                <span className="s-outcome__sub">Ingen vet at resten aldri skjedde</span>
              </span>
            </div>
          </Reveal>

          <Reveal show={step >= 2} delay={0.08}>
            <div className="s-outcome s-outcome--warn">
              <span className="s-outcome__icon">
                <Icon name="refresh" size={30} />
              </span>
              <span>
                Prosessen står på forrige oppgave
                <span className="s-outcome__sub">Neste forsøk begynner helt forfra</span>
              </span>
            </div>
          </Reveal>

          <Reveal show={step >= 2} delay={0.16}>
            <div className="s-outcome s-outcome--bad">
              <span className="s-outcome__icon">
                <Icon name="user" size={30} />
              </span>
              <span>
                Brukeren ser en feilmelding
                <span className="s-outcome__sub">«Noe gikk galt» — prøv igjen</span>
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </Slide>
  );
}
