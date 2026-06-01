import type { PolicyRule } from '../types/Policy';

const deprecatedAltinn2Roles: Record<string, string> = {
  'urn:altinn:rolecode:a0238': 'Revisormedarbeider',
  'urn:altinn:rolecode:a0236': 'Post/arkiv',
  'urn:altinn:rolecode:kladm': 'Klientadministrator',
  'urn:altinn:rolecode:a0293': 'Algetestdata',
  'urn:altinn:rolecode:hvask': 'Økokrim rapportering',
  'urn:altinn:rolecode:a0294': 'Transportløyvegaranti',
  'urn:altinn:rolecode:utinn': 'Utfyller/Innsender',
  'urn:altinn:rolecode:gkbht': 'Godkjenning av bedriftshelsetjeneste',
  'urn:altinn:rolecode:loper': 'Lønn og personalmedarbeider',
  'urn:altinn:rolecode:boadm': 'Konkursbo tilgangsstyring',
  'urn:altinn:rolecode:apiadmnuf': 'Programmeringsgrensesnitt for NUF (API)',
  'urn:altinn:rolecode:pasig': 'Parallell signering',
  'urn:altinn:rolecode:ektj': 'Eksplisitt tjenestedelegering',
  'urn:altinn:rolecode:siskd': 'Begrenset signeringsrettighet',
  'urn:altinn:rolecode:sens01': 'Taushetsbelagt post fra kommunen',
  'urn:altinn:rolecode:revai': 'Revisorrettighet',
  'urn:altinn:rolecode:pavad': 'Patent, varemerke og design',
  'urn:altinn:rolecode:admai': 'Tilgangsstyring',
  'urn:altinn:rolecode:uiluf': 'Samferdsel',
  'urn:altinn:rolecode:sens': 'Hovedrolle for sensitive tjeneste',
  'urn:altinn:rolecode:bobes': 'Konkursbo skrivetilgang',
  'urn:altinn:rolecode:a0288': 'Taushetsbelagt post - administrasjon',
  'urn:altinn:rolecode:attst': 'Revisorattesterer - MVA kompensasjon',
  'urn:altinn:rolecode:regna': 'Regnskapsmedarbeider',
  'urn:altinn:rolecode:a0278': 'Plan- og byggesak',
  'urn:altinn:rolecode:priut': 'Privatperson begrensede rettigheter',
  'urn:altinn:rolecode:a0241': 'Regnskapsfører lønn',
  'urn:altinn:rolecode:bobel': 'Konkursbo lesetilgang',
  'urn:altinn:rolecode:a0286': 'Taushetsbelagt post ',
  'urn:altinn:rolecode:a0240': 'Regnskapsfører uten signeringsrettighet',
  'urn:altinn:rolecode:utomr': 'Energi, miljø og klima',
  'urn:altinn:rolecode:uihtl': 'Helse-, sosial- og velferdstjenester',
  'urn:altinn:rolecode:komab': 'Kommunale tjenester',
  'urn:altinn:rolecode:a0237': 'Ansvarlig revisor',
  'urn:altinn:rolecode:a0212': 'Primærnæring og næringsmiddel',
  'urn:altinn:rolecode:a0298': 'Revisorattesterer',
  'urn:altinn:rolecode:hadm': 'Hovedadministrator',
  'urn:altinn:rolecode:a0287': 'Taushetsbelagt post - oppvekst og utdanning',
  'urn:altinn:rolecode:eckeyrole': 'ECKEYROLE',
  'urn:altinn:rolecode:apiadm': 'Programmeringsgrensesnitt (API)',
  'urn:altinn:rolecode:signe': 'Signerer av Samordnet registermelding',
  'urn:altinn:rolecode:a0239': 'Regnskapsfører med signeringsrettighet',
  'urn:altinn:rolecode:a0282': 'Skatteforhold for privatpersoner',
};

export const getDeprecatedAltinn2SubjectsFromRules = (
  rules: PolicyRule[],
): { urn: string; name: string }[] => {
  return rules.flatMap((rule) => getDeprecatedAltinn2SubjectsFromRule(rule.subject));
};

export const getDeprecatedAltinn2SubjectsFromRule = (
  subjects: string[],
): { urn: string; name: string }[] => {
  return subjects
    .filter((subject) => deprecatedAltinn2Roles.hasOwnProperty(subject))
    .reduce((acc, subject) => {
      const lowerSubject = subject.toLowerCase();
      const name = deprecatedAltinn2Roles[lowerSubject];
      if (name) {
        acc.push({ urn: lowerSubject, name });
      }
      return acc;
    }, []);
};
