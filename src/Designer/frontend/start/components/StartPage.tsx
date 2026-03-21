import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import '../assets/startpage.css';
import altinnLogo from '../assets/AltinnD-logo.svg';
import heroBackground from '../assets/Altinn-studio-stor.svg';
import illustrationDigitalization from '../assets/Altinn-studio-2.svg';
import illustrationTool from '../assets/Altinn-studio-3.svg';
import illustrationSharing from '../assets/Altinn-studio-1.svg';

export const StartPage = (): React.ReactElement => {
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc ?? false;

  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <>
      <header className='an-header'>
        <div className='container'>
          <div className='row'>
            <div className='col-12'>
              <nav id='primary-nav' className='a-globalNav'>
                <a href='/' className='a-globalNav-logo'>
                  <img src={altinnLogo} alt='Altinn logo' />
                  <span className='sr-only'>Til forsiden</span>
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <div className='pt-3'></div>
      <h1 className='sr-only'>Altinn Studio</h1>
      <div
        className='jumbotron jumbotron-fluid a-jumbotron a-jumbotron-header a-jumbotron-header--left a-blueDarkerText'
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className='container'>
          <div className='row'>
            <div className='col-md-12 offset-md-0 col-lg-10 offset-lg-1 col-xl-8 offset-xl-2 text-center'>
              <span className='a-jumbotron-ingress'>
                <span className='a-fontBold'>
                  Velkommen til Altinn Studio – et verktøy for å utvikle digitale tjenester til
                  innbyggere og næringsliv
                </span>
              </span>
            </div>
          </div>
          <div className='row'>
            <div className='col-12 pt-5 text-center'>
              <input
                type='button'
                className='btn-lg text-center'
                onClick={handleLogin}
                value='Logg inn'
              />
              {!studioOidc && (
                <span>
                  <a href='repos/user/sign_up' className='link-new-user'>
                    Opprett ny bruker
                  </a>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className='container'>
        <div>
          <div>
            <div className='row mb-6 mt-2 align-items-center'>
              <div className='col-12 col-md-6 col-lg-5 mb-2 mb-md-0 order-md-1'>
                <img
                  className='d-block mx-auto'
                  src={illustrationDigitalization}
                  alt='Kvinne som sitter med en laptop og en kaffekopp. Illustrasjon.'
                />
              </div>
              <div className='col-12 col-md-6 col-lg-5 offset-lg-1'>
                <h2 className='a-fontBold'>Effektiv digitalisering</h2>
                <p className='a-fontSizeL mb-0'>
                  Digitalisering av offentlige tjenester blir best når etatene samarbeider og deler
                  data. Derfor har vi laget Altinn Studio. Her lager du gode digitale tjenester
                  basert på Altinns sikre infrastruktur, og du kan bruke tekniske komponenter og
                  koblinger som allerede eksisterer i Altinn.
                </p>
              </div>
            </div>
          </div>
          <div>
            <div className='row mb-6 mt-2 align-items-center'>
              <div className='col-12 col-md-6 col-lg-5 mb-2 mb-md-0 offset-lg-1'>
                <img
                  className='d-block mx-auto'
                  src={illustrationTool}
                  alt='Mann som leser dokumenter. Illustrasjon.'
                />
              </div>
              <div className='col-12 col-md-6 col-lg-5'>
                <h2 className='a-fontBold'>Brukervennlig verktøy</h2>
                <p className='a-fontSizeL mb-0'>
                  Det skal være enkelt å lage brukervennlige, universelt utformede tjenester. De
                  aller enkleste skjemaene lager du uten teknisk spisskompetanse. For mer avanserte
                  oppgaver, gir verktøyet utviklere den fleksibiliteten som trengs for å lage et
                  bredt spekter digitale tjenester. Samarbeid i Altinn Studio helt fra tidlige ideer
                  til spesifikasjon og utvikling.
                </p>
              </div>
            </div>
          </div>
          <div>
            <div className='row mb-6 mt-2 align-items-center'>
              <div className='col-12 col-md-6 col-lg-5 mb-2 mb-md-0 order-md-1'>
                <img
                  className='d-block mx-auto'
                  src={illustrationSharing}
                  alt='To personer som håndhilser i en trapp. Illustrasjon.'
                />
              </div>
              <div className='col-12 col-md-6 col-lg-5 offset-lg-1'>
                <h2 className='a-fontBold'>Deling og gjenbruk</h2>
                <p className='a-fontSizeL mb-0'>
                  Få enkel tilgang til registerdata fra blant annet Enhetsregisteret og
                  Folkeregisteret. Lær av andre etater ved å utforske deres tjenester. Du ser både
                  de ferdige tjenestene, og hvordan de er bygget opp med kode og datakilder. Du har
                  full kontroll over egen tjeneste og hvem du ønsker å dele denne med, men vi
                  oppfordrer alle til å dele ideer, løsninger og maler.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col-12 col-lg-10 offset-lg-2 mb-6 a-text'>
            <h3>Hvorfor skal du bruke Altinn Studio?</h3>
            <ul>
              <li>Et sikkert, fleksibelt og brukervennlig verktøy for å lage tjenester</li>
              <li>
                Nye, moderne og brukervennlige digitale tjenester presentert til dine sluttbrukere
              </li>
              <li>Altinns sikre tekniske infrastruktur</li>
              <li>Selvbetjent utvikling og produksjonssetting</li>
              <li>
                Mulighet til å gjenbruke kode, data, funksjonalitet, logikk og dynamikk som andre
                har delt
              </li>
              <li>
                Mulighet til å gjenbruke ferdige GUI-komponenter som er brukertestet og universelt
                utformet
              </li>
              <li>
                Et verktøy som tilrettelegger for samarbeid innad og på tvers av organisasjoner
              </li>
            </ul>
            <h3 id='possibilities' style={{ marginBottom: '-50px', marginTop: '80px' }}>
              Slik tar du i bruk Altinn Studio:
            </h3>
          </div>
        </div>
        <div className='row'>
          <div className='col-sm-12 col-lg-8 offset-lg-2 mb-3'>
            <div
              className='a-accordion-large'
              id='infoAccordion'
              role='tablist'
              aria-multiselectable='true'
            >
              <AccordionCard id='infoItem1' title='Hvordan tar jeg det i bruk?'>
                <p>
                  For å logge inn må du først lage en bruker. Se mer om hvordan komme i gang i{' '}
                  <a href='https://docs.altinn.studio/altinn-studio/getting-started/'>
                    brukerdokumentasjonen til Altinn Studio
                  </a>
                  .
                </p>
                <p>
                  Altinn Studio er under kontinuerlig utvikling, så det vil være stadige
                  forbedringer med ny funksjonalitet og feilretting.
                </p>
                <p>
                  Altinn Studio er tilgjengelig for alle som{' '}
                  <a href='https://github.com/Altinn/altinn-studio'>
                    åpen kildekode på Altinns Github
                  </a>
                  .
                </p>
                <p>
                  Ønsker du å publisere tjenestene dine på altinn.no eller benytte deg av Altinns
                  infrastruktur? Da trenger du{' '}
                  <a href='https://samarbeid.digdir.no/altinn/bli-tjenesteeier-i-altinn/2819'>
                    en avtale hos oss
                  </a>
                  . I tillegg må tjenesteeier{' '}
                  <a href='https://digdir.apps.altinn.no/digdir/godkjenn-bruksvilkaar/'>
                    godta bruksvilkår for Altinn i skyen
                  </a>
                  .
                </p>
              </AccordionCard>
              <AccordionCard id='infoItem2' title='Når kan jeg ta det i bruk?'>
                <p>
                  Altinn Studio er klart til bruk. Bare sett i gang med å opprette, lage og teste
                  dine tjenester.
                </p>
                <p>
                  Av erfaring vet vi at det tar lang tid å finne ut av hvordan en ny tjeneste skal
                  være. Derfor oppfordrer deg til å allerede nå tenke på hvordan de nye tjenestene
                  skal fungere, selv om de ikke skal på lufta med det første.
                </p>
                <p>
                  Altinn Studio vil over tid erstatte de tidligere verktøyene InfoPath, TUL og SERES
                  domeneklient.
                </p>
                <p>
                  Gamle verktøy vil være tilgjengelige for endringer i eksisterende tjenester frem
                  til 2026.
                </p>
              </AccordionCard>
              <AccordionCard id='infoItem3' title='Hvordan kan jeg bidra?'>
                <p>
                  Du kan bidra på flere måter, herunder direkte med kildekode, siden prosjektet
                  ligger åpent tilgjengelig på Github.
                </p>
                <p>
                  Du kan følge teamet som jobber med utviklingen og bidra direkte med
                  endringsønsker, feil og spørsmål gjennom{' '}
                  <a href='https://github.com/Altinn/altinn-studio/issues'>backlogen i Github</a>
                </p>
                <p>
                  Se mer{' '}
                  <a href='https://github.com/Altinn/altinn-studio/blob/master/CONTRIBUTING.md'>
                    informasjon om hvordan du kan bidra
                  </a>{' '}
                  på vårt Github-prosjekt.
                </p>
              </AccordionCard>
              <AccordionCard id='infoItem4' title='Hvordan får jeg vite mer om Altinn Studio?'>
                <p>
                  Prosjektet har kaffe-møter med status, planer og temagjennomganger. Disse vil bli
                  annonsert fortløpende i{' '}
                  <a href='https://www.digdir.no/digdir/arrangementsoversikt/692'>
                    arrangementsoversikten på Altinn digitalisering
                  </a>
                  .
                </p>
                <p>
                  Du kan følge backlogen til teamet som jobber med utviklingen på{' '}
                  <a href='https://github.com/Altinn/altinn-studio/issues'>Github</a>.
                </p>
                <p>
                  Du kan lese mer her på sidene for{' '}
                  <a href='https://docs.altinn.studio/'>teknisk dokumentasjon</a>.
                </p>
              </AccordionCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

type AccordionCardProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

const AccordionCard = ({ id, title, children }: AccordionCardProps): React.ReactElement => {
  return (
    <div className='card'>
      <div>
        <a
          data-toggle='collapse'
          data-parent='#infoAccordion'
          href={`#${id}`}
          role='tab'
          aria-expanded='false'
          className='a-collapse-title no-decoration a-h3 collapsed'
        >
          <span className='a-dropdownCircleArrow'>
            <span className='ai' aria-hidden='true'>
              <span className='sr-only'>Vis/skjul innhold</span>
            </span>
          </span>
          {title}
        </a>
      </div>
      <div id={id} className='a-collapseContent collapse' data-parent='#accordion' role='tabpanel'>
        <div className='a-collapseContent-inside'>
          <div className='mt-1'>{children}</div>
        </div>
      </div>
    </div>
  );
};
