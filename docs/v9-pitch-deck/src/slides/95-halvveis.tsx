import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import type { IconName } from '../components';

const CARDS: {
  icon: IconName;
  status: string;
  title: string;
  body: string;
  tone: 'ok' | 'bad' | 'idle' | 'warn';
}[] = [
  {
    icon: 'document',
    status: 'Lagret',
    title: 'PDF-en',
    body: 'Ble laget og ligger igjen.',
    tone: 'ok',
  },
  {
    icon: 'send',
    status: 'Feilet',
    title: 'Forsendelsen',
    body: 'Prosessen står stille.',
    tone: 'bad',
  },
  {
    icon: 'bell',
    status: 'Ukjent',
    title: 'Hendelsen',
    body: 'Ble borte uten en lyd.',
    tone: 'idle',
  },
  {
    icon: 'layers',
    status: 'Halvveis',
    title: 'Vedleggene',
    // «Kan alt ligge …» is grammatical, but on a slide it reads first as
    // «can *everything* be lying …», which is the opposite of the point.
    body: 'Kan allerede ligge hos mottakeren.',
    tone: 'warn',
  },
];

/**
 * The fifth failure mode, and the only one with a half-answer today: two
 * clicks, or the same click sent twice. From v8.11 a Storage lock lease (5 min
 * TTL, 409 on contention) stops two *simultaneous* clicks — but there is no
 * idempotency key, so a retried request after the connection dropped is not
 * recognised as the same attempt. v9 keys the enqueue on instance + version:
 * same key and same body answers 200 and creates nothing new.
 * (CONTENT.md §1.7 and §1.13.)
 */
const DOUBLE = {
  v8: 'Låsen fra v8.11 stopper to samtidige klikk — men ikke det samme forsøket én gang til.',
  v9: 'Med prosessmotoren gir samme forsøk samme svar, og ingenting nytt blir opprettet.',
};

/** Slide 6 — the failure modes of a half-finished chain. */
export default function HalvveisSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="full"
      kicker="I dag · v8"
      title="Halvveis utført"
      subtitle="PDF-en ble laget. Forsendelsen feilet. Prosessen står stille. Hendelsen som skulle varslet andre systemer, ble borte uten en lyd."
    >
      <div className="s-fill">
        <div className="s-fcards">
          {CARDS.map((card, i) => (
            <Reveal key={card.title} show={step >= i} delay={i === 0 ? 0 : 0.04}>
              <div className={`s-fcard is-${card.tone}`}>
                <span className="s-fcard__icon">
                  <Icon name={card.icon} size={36} />
                </span>
                <p className="s-fcard__status">{card.status}</p>
                <h3 className="s-fcard__title">{card.title}</h3>
                <p className="s-fcard__body">{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal show={step >= 4}>
          <div className="s-fnote">
            <span className="s-fnote__icon">
              <Icon name="refresh" size={40} />
            </span>
            <div className="s-fnote__half is-v8">
              <p className="s-fnote__label">Dobbeltklikk i dag</p>
              <p className="s-fnote__text">{DOUBLE.v8}</p>
            </div>
            <div className="s-fnote__half is-v9">
              <p className="s-fnote__label">Med prosessmotor</p>
              <p className="s-fnote__text">{DOUBLE.v9}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </Slide>
  );
}
