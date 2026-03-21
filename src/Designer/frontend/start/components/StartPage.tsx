import { useState } from 'react';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { StudioButton, StudioHeading, StudioLink, StudioParagraph } from '@studio/components';
import { Accordion } from '@digdir/designsystemet-react';
import altinnLogo from '../assets/AltinnD-logo.svg';
import heroBackground from '../assets/Altinn-studio-stor.svg';
import illustrationDigitalization from '../assets/Altinn-studio-2.svg';
import illustrationTool from '../assets/Altinn-studio-3.svg';
import illustrationSharing from '../assets/Altinn-studio-1.svg';
import { LoginGuide, shouldSkipLoginGuide } from './LoginGuide';
import classes from './StartPage.module.css';

export const StartPage = (): React.ReactElement => {
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc ?? false;
  const [showGuide, setShowGuide] = useState(false);

  const handleLogin = () => {
    if (studioOidc && !shouldSkipLoginGuide()) {
      setShowGuide(true);
      return;
    }
    window.location.href = '/login';
  };

  if (showGuide) {
    return <LoginGuide accountLinkUrl={environment?.accountLinkUrl} />;
  }

  return (
    <div className={classes.page}>
      <section className={classes.hero} style={{ backgroundImage: `url(${heroBackground})` }}>
        <header className={classes.header}>
          <a href='/'>
            <img src={altinnLogo} alt='Altinn logo' className={classes.logo} />
          </a>
        </header>
        <StudioHeading level={1} data-size='sm' className={classes.heroHeading}>
          Velkommen til Altinn Studio – et verktøy for å utvikle digitale tjenester til innbyggere
          og næringsliv
        </StudioHeading>
        <div className={classes.heroActions}>
          <StudioButton variant='secondary' data-size='lg' onClick={handleLogin}>
            Logg inn
          </StudioButton>
          {!studioOidc && (
            <a href='repos/user/sign_up' className={classes.signupLink}>
              Opprett ny bruker
            </a>
          )}
        </div>
      </section>

      <main className={classes.content}>
        <div className={classes.infoSection}>
          <div className={classes.infoBlock}>
            <div>
              <StudioHeading level={2} data-size='sm'>
                Effektiv digitalisering
              </StudioHeading>
              <StudioParagraph data-size='sm'>
                Digitalisering av offentlige tjenester blir best når etatene samarbeider og deler
                data. Derfor har vi laget Altinn Studio. Her lager du gode digitale tjenester basert
                på Altinns sikre infrastruktur, og du kan bruke tekniske komponenter og koblinger
                som allerede eksisterer i Altinn.
              </StudioParagraph>
            </div>
            <img
              className={classes.infoImage}
              src={illustrationDigitalization}
              alt='Kvinne som sitter med en laptop og en kaffekopp. Illustrasjon.'
            />
          </div>

          <div className={classes.infoBlock}>
            <img
              className={classes.infoImage}
              src={illustrationTool}
              alt='Mann som leser dokumenter. Illustrasjon.'
            />
            <div>
              <StudioHeading level={2} data-size='sm'>
                Brukervennlig verktøy
              </StudioHeading>
              <StudioParagraph data-size='sm'>
                Det skal være enkelt å lage brukervennlige, universelt utformede tjenester. De aller
                enkleste skjemaene lager du uten teknisk spisskompetanse. For mer avanserte
                oppgaver, gir verktøyet utviklere den fleksibiliteten som trengs for å lage et bredt
                spekter digitale tjenester. Samarbeid i Altinn Studio helt fra tidlige ideer til
                spesifikasjon og utvikling.
              </StudioParagraph>
            </div>
          </div>

          <div className={classes.infoBlock}>
            <div>
              <StudioHeading level={2} data-size='sm'>
                Deling og gjenbruk
              </StudioHeading>
              <StudioParagraph data-size='sm'>
                Få enkel tilgang til registerdata fra blant annet Enhetsregisteret og
                Folkeregisteret. Lær av andre etater ved å utforske deres tjenester. Du ser både de
                ferdige tjenestene, og hvordan de er bygget opp med kode og datakilder. Du har full
                kontroll over egen tjeneste og hvem du ønsker å dele denne med, men vi oppfordrer
                alle til å dele ideer, løsninger og maler.
              </StudioParagraph>
            </div>
            <img
              className={classes.infoImage}
              src={illustrationSharing}
              alt='To personer som håndhilser i en trapp. Illustrasjon.'
            />
          </div>
        </div>

        <section className={classes.benefitsSection}>
          <StudioHeading level={3} data-size='xs'>
            Hvorfor skal du bruke Altinn Studio?
          </StudioHeading>
          <ul className={classes.benefitsList}>
            <li>Et sikkert, fleksibelt og brukervennlig verktøy for å lage tjenester</li>
            <li>
              Nye, moderne og brukervennlige digitale tjenester presentert til dine sluttbrukere
            </li>
            <li>Altinns sikre tekniske infrastruktur</li>
            <li>Selvbetjent utvikling og produksjonssetting</li>
            <li>
              Mulighet til å gjenbruke kode, data, funksjonalitet, logikk og dynamikk som andre har
              delt
            </li>
            <li>
              Mulighet til å gjenbruke ferdige GUI-komponenter som er brukertestet og universelt
              utformet
            </li>
            <li>Et verktøy som tilrettelegger for samarbeid innad og på tvers av organisasjoner</li>
          </ul>
        </section>

        <section className={classes.faqSection}>
          <StudioHeading level={3} data-size='xs'>
            Slik tar du i bruk Altinn Studio:
          </StudioHeading>
          <Accordion>
            <Accordion.Item>
              <Accordion.Header>Hvordan tar jeg det i bruk?</Accordion.Header>
              <Accordion.Content>
                <StudioParagraph data-size='sm'>
                  For å logge inn må du først lage en bruker. Se mer om hvordan komme i gang i{' '}
                  <StudioLink href='https://docs.altinn.studio/altinn-studio/getting-started/'>
                    brukerdokumentasjonen til Altinn Studio
                  </StudioLink>
                  .
                </StudioParagraph>
                <StudioParagraph data-size='sm'>
                  Altinn Studio er under kontinuerlig utvikling, så det vil være stadige
                  forbedringer med ny funksjonalitet og feilretting.
                </StudioParagraph>
                <StudioParagraph data-size='sm'>
                  Altinn Studio er tilgjengelig for alle som{' '}
                  <StudioLink href='https://github.com/Altinn/altinn-studio'>
                    åpen kildekode på Altinns Github
                  </StudioLink>
                  .
                </StudioParagraph>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>Når kan jeg ta det i bruk?</Accordion.Header>
              <Accordion.Content>
                <StudioParagraph data-size='sm'>
                  Altinn Studio er klart til bruk. Bare sett i gang med å opprette, lage og teste
                  dine tjenester.
                </StudioParagraph>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>Hvordan kan jeg bidra?</Accordion.Header>
              <Accordion.Content>
                <StudioParagraph data-size='sm'>
                  Du kan bidra på flere måter, herunder direkte med kildekode, siden prosjektet
                  ligger åpent tilgjengelig på Github. Du kan følge teamet som jobber med
                  utviklingen og bidra direkte med endringsønsker, feil og spørsmål gjennom{' '}
                  <StudioLink href='https://github.com/Altinn/altinn-studio/issues'>
                    backlogen i Github
                  </StudioLink>
                  .
                </StudioParagraph>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>Hvordan får jeg vite mer om Altinn Studio?</Accordion.Header>
              <Accordion.Content>
                <StudioParagraph data-size='sm'>
                  Du kan følge backlogen til teamet som jobber med utviklingen på{' '}
                  <StudioLink href='https://github.com/Altinn/altinn-studio/issues'>
                    Github
                  </StudioLink>
                  .
                </StudioParagraph>
                <StudioParagraph data-size='sm'>
                  Du kan lese mer her på sidene for{' '}
                  <StudioLink href='https://docs.altinn.studio/'>teknisk dokumentasjon</StudioLink>.
                </StudioParagraph>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </section>
      </main>
    </div>
  );
};
