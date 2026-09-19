import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import { Chain, RequestBubble } from './_kit';

/** Slide 2 — the v8 storyboard: one request does all of it. */
export default function IDagSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="I dag · v8"
      title="Slik ser det ut i dag"
      subtitle="App-en låser instansen, avslutter oppgaven, låser data, lager PDF, sender forsendelse og registrerer hendelser. Alt i én forespørsel."
    >
      <div className="s-fill">
        <RequestBubble
          label={
            <>
              <Icon name="clock" size={26} />
              Én forespørsel — brukeren venter
            </>
          }
        >
          <Chain />
        </RequestBubble>

        <div className="s-outcomes s-outcomes--2">
          <Reveal show={step >= 1}>
            <div className="s-outcome s-outcome--warn">
              <span className="s-outcome__icon">
                <Icon name="alert" size={30} />
              </span>
              <span>
                Ingen transaksjon rundt rekka
                <span className="s-outcome__sub">Ett «await» etter et annet, i rett linje</span>
              </span>
            </div>
          </Reveal>

          <Reveal show={step >= 2}>
            <div className="s-outcome s-outcome--warn">
              <span className="s-outcome__icon">
                <Icon name="x" size={30} />
              </span>
              <span>
                Ingenting rydder opp
                <span className="s-outcome__sub">Brytes linjen på midten, blir den liggende</span>
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </Slide>
  );
}
