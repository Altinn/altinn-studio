import { SectionSlide } from './_kit';

/** The dividers between the parts of the talk. */
export function SeksjonInfrastruktur() {
  return <SectionSlide no="Del 1" title="Infrastruktur" lead="Plattformen appene kjører på." />;
}

export function SeksjonFrontend() {
  return <SectionSlide no="Del 2" title="Frontend" lead="Det brukerne ser og klikker i." />;
}

export function SeksjonBackend() {
  return <SectionSlide no="Del 3" title="Backend" lead="Det som skjer etter «Send inn»." />;
}

export function SeksjonReserve() {
  return (
    <SectionSlide
      no="Reserve"
      title="Under panseret"
      lead="Hvordan v8 gjør det i dag, og hvordan motoren er bygget. For spørsmål."
    />
  );
}
