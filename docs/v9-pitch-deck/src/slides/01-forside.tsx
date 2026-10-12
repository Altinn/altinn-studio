import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { Backdrop, BrandMark, PartList } from './_kit';

/** The cover, and the map of the talk. */
export default function ForsideSlide(_: SlideProps) {
  return (
    <Slide variant='full'>
      <Backdrop />
      <BrandMark place='top' />

      <div className='s-cover'>
        <div className='s-cover__col'>
          <p className='s-cover__kicker'>Altinn-apper · v9</p>
          <h1 className='s-cover__title'>Hva blir bedre med v9?</h1>
          <p className='s-cover__lead'>
            Raskere skjemaer, tryggere prosesser og enklere drift, fra plattformen og helt ut til
            brukeren.
          </p>
        </div>

        <PartList />
      </div>
    </Slide>
  );
}
