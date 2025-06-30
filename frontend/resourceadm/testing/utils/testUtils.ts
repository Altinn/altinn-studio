export const testConsentTemplates = [
  {
    id: 'poa',
    version: 1,
    title: 'Fullmakt til å utføre en tjeneste',
    isPoa: true,
    isMessageSetInRequest: true,
    restrictedToServiceOwners: null,
    texts: {
      title: {
        person: {
          nb: 'Fullmakt til å handle på dine vegne',
          nn: 'Fullmakt til å handla på dine vegne',
          en: 'Power of attorney to act on your behalf',
        },
        org: {
          nb: 'Fullmakt til å handle på vegne av {OfferedBy}',
          nn: 'Fullmakt til å handla på vegne av {OfferedBy}',
          en: 'Power of attorney to act on behalf of {OfferedBy}',
        },
      },
      heading: {
        person: {
          nb: '{CoveredBy} ønsker å utføre tjenester på dine vegne',
          nn: '{CoveredBy} ønsker å utføra tenester på dine vegne',
          en: '{CoveredBy} requests power of attorney from you',
        },
        org: {
          nb: '{CoveredBy} ønsker å utføre tjenester på vegne av {OfferedBy}',
          nn: '{CoveredBy} ønsker å utføra tenester på vegne av {OfferedBy}',
          en: '{CoveredBy} requests power of attorney from {OfferedBy}',
        },
      },
      serviceIntro: {
        person: {
          nb: 'Ved at du gir fullmakt, får {CoveredBy} tilgang til følgende tjenester på dine vegne',
          nn: 'Ved at du gjer fullmakt, får {CoveredBy} tilgang til følgjande tenester på dine vegne',
          en: 'By granting power of attorney, {CoveredBy} gets access to the following services on your behalf',
        },
        org: {
          nb: 'Ved at du gir fullmakt, får {CoveredBy} tilgang til følgende tjenester på vegne av {OfferedBy}',
          nn: 'Ved at du gjer fullmakt, får {CoveredBy} tilgang til følgjande tenester på vegne av {OfferedBy}',
          en: 'By granting power of attorney, {CoveredBy} get access to the following services on behalf of {OfferedBy}',
        },
      },
      overriddenDelegationContext: null,
      expiration: {
        nb: 'Fullmakten er tidsavgrenset og vil gå ut {Expiration}',
        nn: 'Fullmakta er tidsavgrensa og vil gå ut {Expiration}',
        en: 'The power of attorney is time-limited, and will expire {Expiration}',
      },
      expirationOneTime: {
        nb: 'Fullmakten gjelder én gangs bruk av tjenestene',
        nn: 'Fullmakta gjeld bruk av tenestene éin gong',
        en: 'The power of attorney applies for one-time access to the service.',
      },
      serviceIntroAccepted: {
        person: {
          nb: 'Fullmakten gir {CoveredBy} tilgang til følgende tjenester på dine vegne',
          nn: 'Fullmakta gjer {CoveredBy} tilgang til følgjande tenester på dine vegne',
          en: 'The power of attorney gives {CoveredBy} access to the following services on your behalf',
        },
        org: {
          nb: 'Fullmakten gir {CoveredBy} tilgang til følgende tjenester på vegne av {OfferedBy}',
          nn: 'Fullmakta gjer {CoveredBy} tilgang til følgjande tenester på vegne av {OfferedBy}',
          en: 'The power of attorney gives {CoveredBy} access to the following services on behalf of {OfferedBy}',
        },
      },
      handledBy: {
        nb: '{HandledBy} utfører tjenestene på vegne av {CoveredBy}.',
        nn: '{HandledBy} utfører tenestene på vegne av {CoveredBy}',
        en: '{HandledBy} utilizes the power of attorney on behalf of {CoveredBy}.',
      },
      historyUsedBody: {
        nb: '{CoveredBy} har handlet på vegne av {OfferedBy}. Fullmakten utløper {Expiration}',
        nn: '{CoveredBy} har handlet på vegne av {OfferedBy}. Fullmakten utløper {Expiration}',
        en: '{CoveredBy} has acted on behalf of {OfferedBy}. The authority expires {Expiration}',
      },
      historyUsedByHandledByBody: {
        nb: '{HandledBy} har, på vegne av {CoveredBy}, handlet på vegne av {OfferedBy}. Fullmakten utløper {Expiration}',
        nn: '{HandledBy} har, på vegne av {CoveredBy}, handla på vegne av {OfferedBy}. Samtykket utløper {Expiration}',
        en: '{HandledBy} has, on behalf of {CoveredBy}, acted on behalf of {OfferedBy}. The authority expires {Expiration}',
      },
    },
  },
  {
    id: 'sblanesoknad',
    version: 1,
    title: 'Samtykkebasert lånesøknad',
    isPoa: false,
    isMessageSetInRequest: false,
    restrictedToServiceOwners: ['skd', 'ttd'],
    texts: {
      title: {
        person: {
          nb: 'Samtykke til bruk av dine data',
          nn: 'Samtykke til bruk av dine data',
          en: 'Consent to use of your data',
        },
        org: {
          nb: 'Samtykke til bruk av {OfferedBy} sine data',
          nn: 'Samtykke til bruk av {OfferedBy} sine data',
          en: 'Consent to use of the data of {OfferedBy}',
        },
      },
      heading: {
        person: {
          nb: '{CoveredBy} ønsker å hente opplysninger om deg',
          nn: '{CoveredBy} ønskjer å hente opplysningar om deg',
          en: '{CoveredBy} requests information about you',
        },
        org: {
          nb: '{CoveredBy} ønsker å hente opplysninger om {OfferedBy}',
          nn: '{CoveredBy} ønskjer å hente opplysningar om  {OfferedBy}',
          en: '{CoveredBy} requests information about {OfferedBy}',
        },
      },
      serviceIntro: {
        person: {
          nb: 'Ved at du samtykker, får {CoveredBy} tilgang til følgende opplysninger om deg',
          nn: 'Ved at du samtykker, får {CoveredBy} tilgang til følgjande opplysningar om deg',
          en: 'By giving consent, {CoveredBy} gets access to the following information about you',
        },
        org: {
          nb: 'Ved at du samtykker, får {CoveredBy} tilgang til følgende opplysninger om {OfferedBy}',
          nn: 'Ved at du samtykker, får {CoveredBy} tilgang til følgjande opplysningar om {OfferedBy}',
          en: 'By giving consent, {CoveredBy} gets access to the following information about {OfferedBy}',
        },
      },
      overriddenDelegationContext: {
        nb: 'Ved å samtykke, gir du Skatteetaten rett til å utlevere opplysninger om deg direkte til {CoveredBy}. Banken får opplysningene for å behandle søknaden din om finansiering',
        nn: 'Ved å samtykka, gir du Skatteetaten rett til å utlevera opplysningar om deg direkte til {CoveredBy}. Banken får opplysningane for å behandla søknaden din om finansiering.',
        en: 'By consenting you grant the The Norwegian Tax Administration the right to disclose information about you directly to {CoveredBy}. The bank receives the information to process your application for financing',
      },
      expiration: {
        nb: 'Samtykket er tidsavgrenset og vil gå ut {Expiration}',
        nn: 'Samtykket er tidsavgrensa og vil gå ut {Expiration}',
        en: 'The consent is time-limited, and will expire {Expiration}',
      },
      expirationOneTime: {
        nb: 'Samtykket gjelder én gangs utlevering av opplysningene.',
        nn: 'Samtykket gjeld ein gongs utlevering av opplysningane.',
        en: 'The consent applies for one-time disclosure of information.',
      },
      serviceIntroAccepted: {
        person: {
          nb: 'Samtykket gir {CoveredBy} tilgang til følgende opplysninger om deg',
          nn: 'Samtykket gir {CoveredBy} tilgang til følgjande opplysningar om deg',
          en: 'The consent gives {CoveredBy} access to the following information about you',
        },
        org: {
          nb: 'Samtykket gir {CoveredBy} tilgang til følgende opplysninger om {OfferedBy}',
          nn: 'Samtykket gir {CoveredBy} tilgang til følgjande opplysningar om {OfferedBy}',
          en: 'The consent gives {CoveredBy} access to the following information about {OfferedBy}',
        },
      },
      handledBy: {
        nb: '{HandledBy} foretar dette oppslaget på vegne av {CoveredBy}.',
        nn: '{HandledBy} gjer dette oppslaget på vegne av {CoveredBy}.',
        en: '{HandledBy} performs the lookup on behalf of {CoveredBy}.',
      },
      historyUsedBody: {
        nb: '{CoveredBy} har hentet data for {OfferedBy}. Samtykket utløper {Expiration}',
        nn: '{CoveredBy} har henta data for {OfferedBy}. Samtykket utløper {Expiration}',
        en: '{CoveredBy} has retrieved data for {OfferedBy}. The consent expires {Expiration}',
      },
      historyUsedByHandledByBody: {
        nb: '{HandledBy} har, på vegne av {CoveredBy}, hentet data om {OfferedBy}. Samtykket utløper {Expiration}',
        nn: '{HandledBy} har, på vegne av {CoveredBy}, henta data om {OfferedBy}. Samtykket utløper {Expiration}',
        en: '{HandledBy} has, on behalf of {CoveredBy}, retrieved data about {OfferedBy}. The consent expires {Expiration}',
      },
    },
  },
];
