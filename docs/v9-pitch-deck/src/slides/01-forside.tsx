import type { SlideProps } from '../deck';
import { Slide, Icon, Reveal } from '../components';
import type { IconName } from '../components';
import { Backdrop, BrandMark } from './_kit';

const PARTS: { icon: IconName; no: string; title: string; body: string }[] = [
  { icon: 'server', no: 'Del 1', title: 'Infrastruktur', body: 'Plattformen appene kjører på' },
  { icon: 'eye', no: 'Del 2', title: 'Frontend', body: 'Det brukerne ser og klikker i' },
  { icon: 'send', no: 'Del 3', title: 'Backend', body: 'Det som skjer etter «Send inn»' },
];

/** The cover, and the map of the talk: one part per click. */
export default function ForsideSlide({ step }: SlideProps) {
  return (
    <Slide variant='full'>
      <Backdrop />
      <BrandMark place='top' />

      <div className='s-cover'>
        <div className='s-cover__col'>
          <p className='s-cover__kicker'>Altinn-apper · v9</p>
          <h1 className='s-cover__title'>Hva blir bedre med v9?</h1>
          <p className='s-cover__lead'>
            Raskere skjema, tryggere innsending og enklere drift — fra plattformen og helt ut til
            brukeren.
          </p>
        </div>

        <ol className='s-pillars'>
          {PARTS.map((part, i) => (
            <Reveal key={part.title} show={step >= i} from='right'>
              <li className='s-pillar'>
                <span className='s-pillar__icon'>
                  <Icon name={part.icon} size={40} />
                </span>
                <span className='s-pillar__text'>
                  <span className='s-pillar__no'>{part.no}</span>
                  <span className='s-pillar__title'>{part.title}</span>
                  <span className='s-pillar__body'>{part.body}</span>
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </Slide>
  );
}
