import type { SlideProps } from '../deck';
import { Slide, Icon } from '../components';
import { ArrowDefs, Enter, StepRow, Wire } from './_kit';

/** The backend part's lead slide: the app, the process engine, and the saved steps. */
export default function ProsessmotorSlide(_: SlideProps) {
  return (
    <Slide
      variant='full'
      kicker='Backend'
      title='En motor for prosessene'
      subtitle='Appen sier hva som skal skje. Prosessmotoren sørger for at det blir gjort.'
    >
      {/*
        Each part enters as the slide arrives, left to right, like the tiles on
        the other slides. The Enter wrappers take no space, so every part keeps
        its absolute position inside .s-arch.
      */}
      <div className='s-arch'>
        <Enter index={1}>
          <svg className='s-arch__svg' viewBox='0 0 1656 520' width={1656} height={520} aria-hidden>
            <ArrowDefs />
            <Wire d='M360 240 H 652' tone='blue' />
            <Wire d='M660 340 H 368' tone='teal' />
            <Wire d='M1060 260 H 1192' tone='teal' />
          </svg>
          <span
            className='s-arrowlabel'
            style={{ left: 510, top: 186, transform: 'translateX(-50%)' }}
          >
            Hva som skal skje
          </span>
          <span
            className='s-arrowlabel'
            style={{ left: 510, top: 286, transform: 'translateX(-50%)' }}
          >
            Gjør steget
          </span>
        </Enter>

        <Enter index={0}>
          <div
            className='s-unit s-unit--app'
            style={{ left: 0, top: 160, width: 360, height: 240 }}
          >
            <Icon name='user' size={44} />
            <span className='s-unit__title'>Altinn-app</span>
            <span className='s-unit__sub'>Skjema, oppgaver og logikk</span>
          </div>
        </Enter>

        <Enter index={1}>
          <div
            className='s-unit s-unit--engine'
            style={{ left: 660, top: 160, width: 400, height: 240 }}
          >
            <Icon name='server' size={44} />
            <span className='s-unit__title'>Prosessmotor</span>
            <span className='s-unit__sub'>Holder orden på stegene</span>
          </div>
        </Enter>

        <Enter index={2}>
          <div className='s-db' style={{ left: 1200, top: 96, width: 456 }}>
            <p className='s-db__head'>
              <Icon name='database' size={24} />
              Lagrede steg
            </p>
            <StepRow label='1 · Avslutt oppgaven' state='Fullført' tone='ok' />
            <StepRow label='2 · Lag PDF' state='Fullført' tone='ok' />
            <StepRow label='3 · Send til mottaker' state='Kjører' tone='run' />
            <StepRow label='4 · Varsle andre systemer' state='I kø' tone='idle' />
          </div>
        </Enter>
      </div>
    </Slide>
  );
}
