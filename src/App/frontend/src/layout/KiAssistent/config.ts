import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

/**
 * KI-assistert utfylling: en talesamtale som veileder søkeren gjennom skjemaet.
 *
 * Feltene defineres i layouten, ikke i koden, slik at komponenten kan brukes på
 * andre skjemaer enn TT-kort.
 */
export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'KI-assistert utfylling', en: 'AI assisted filling' },
    lifecycle: { status: 'beta' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: false,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addProperty(
    new CG.prop(
      'felt',
      new CG.arr(
        new CG.obj(
          new CG.prop('id', new CG.str().setTitle('Field id', 'Felt-id')),
          new CG.prop('binding', new CG.dataModelBinding().setTitle('Binding', 'Databinding')),
          new CG.prop('sporsmaal', new CG.str().setTitle('Question', 'Spørsmål')),
          new CG.prop(
            'komponentId',
            new CG.str()
              .optional()
              .setTitle('Component to highlight', 'Komponent som markeres')
              .setDescription(
                'Id of the layout component to scroll to and highlight while working on this field.',
                'Id-en til komponenten det skal rulles til og markeres mens feltet fylles ut.',
              ),
          ),
          new CG.prop(
            'alternativer',
            new CG.arr(
              new CG.obj(
                new CG.prop('value', new CG.str()),
                new CG.prop('label', new CG.str()),
              ).exportAs('IKiAlternativ'),
            )
              .optional()
              .setTitle('Options', 'Alternativer'),
          ),
          new CG.prop(
            'flervalg',
            new CG.bool().optional({ default: false }).setTitle('Multiple choice', 'Flervalg'),
          ),
          new CG.prop(
            'kunNaar',
            new CG.str()
              .optional()
              .setTitle('Only when', 'Bare når')
              .setDescription(
                'Field id and value on the form "id=value". The field is skipped unless it matches.',
                'Felt-id og verdi på formen «id=verdi». Feltet hoppes over hvis det ikke stemmer.',
              ),
          ),
        ).exportAs('IKiFelt'),
      ).setTitle('Fields', 'Felter'),
    ),
  )
  .addProperty(
    new CG.prop(
      'forhaandsutfylt',
      new CG.arr(
        new CG.obj(
          new CG.prop('id', new CG.str()),
          new CG.prop('binding', new CG.dataModelBinding()),
          new CG.prop('etikett', new CG.str().setTitle('Label', 'Ledetekst')),
          new CG.prop('komponentId', new CG.str().optional().setTitle('Component', 'Komponent')),
          new CG.prop(
            'kanRettes',
            new CG.bool()
              .optional({ default: false })
              .setTitle('Correctable here', 'Kan rettes her')
              .setDescription(
                'False for data owned by a register the citizen cannot change from this form.',
                'Usann for data som eies av et register søkeren ikke kan endre herfra.',
              ),
          ),
        ).exportAs('IKiForhaandsutfylt'),
      )
        .optional()
        .setTitle('Prefilled fields', 'Forhåndsutfylte felter'),
    ),
  )
  .addProperty(
    new CG.prop(
      'brukesBinding',
      new CG.dataModelBinding()
        .optional()
        .setTitle('Assistant-used marker', 'Markør for at assistenten er i bruk')
        .setDescription(
          'Set to "true" when the conversation starts, so the rest of the form can adapt.',
          'Settes til «true» når samtalen starter, slik at resten av skjemaet kan tilpasse seg.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'merknadBinding',
      new CG.dataModelBinding()
        .optional()
        .setTitle('Remark binding', 'Binding for merknad')
        .setDescription(
          'Where to record that prefilled data is wrong but cannot be corrected here.',
          'Hvor det skrives at forhåndsutfylte data er feil, men ikke kan rettes herfra.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'sendKnappId',
      new CG.str()
        .optional()
        .setTitle('Submit button id', 'Id for send-knappen')
        .setDescription(
          'The assistant points at this button. It never presses it.',
          'Assistenten peker på denne knappen. Den trykker den aldri.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'taledeteksjon',
      new CG.str()
        .optional({ default: 'semantic_vad' })
        .setTitle('Turn detection', 'Taledeteksjon')
        .setDescription(
          'semantic_vad waits until the sentence seems finished. server_vad waits a fixed silence.',
          'semantic_vad venter til setningen virker ferdig. server_vad venter en fast stillhet.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'utaalmodighet',
      new CG.str()
        .optional({ default: 'low' })
        .setTitle('Eagerness', 'Utålmodighet')
        .setDescription(
          'For semantic_vad. low lets the person speak uninterrupted.',
          'For semantic_vad. low lar personen snakke uavbrutt.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'stillhetMs',
      new CG.int()
        .optional({ default: 4000 })
        .setTitle('Silence before answering', 'Stillhet før svar')
        .setDescription(
          'For server_vad. Milliseconds of silence before the turn is considered over.',
          'For server_vad. Millisekunder stillhet før turen regnes som slutt.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'stoyreduksjon',
      new CG.str()
        .optional({ default: 'av' })
        .setTitle('Noise reduction', 'Støyreduksjon')
        .setDescription(
          'av turns it off, near_field for headsets, far_field for laptop or room microphones. Filters audio before turn detection, and can suppress a weak voice.',
          'av slår den av, near_field for headset, far_field for maskin- eller rommikrofon. Filtrerer lyden før taledeteksjon, og kan dempe en svak stemme.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'terskel',
      new CG.num()
        .optional({ default: 0.6 })
        .setTitle('Voice activity threshold', 'Terskel for taledeteksjon')
        .setDescription(
          'For server_vad, 0-1. Higher means less sensitive to sound that is not speech.',
          'For server_vad, 0-1. Høyere gjør den mindre følsom for lyd som ikke er tale.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'sprak',
      new CG.str()
        .optional({ default: 'no' })
        .setTitle('Spoken language', 'Talespråk')
        .setDescription(
          'ISO-639-1 code for the language spoken, e.g. no. Improves speech recognition accuracy. Invalid codes are rejected by the API.',
          'ISO-639-1-kode for språket som snakkes, for eksempel no. Gir bedre talegjenkjenning. Ugyldige koder avvises av API-et.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'transkripsjonsmodell',
      new CG.str()
        .optional({ default: 'gpt-4o-transcribe' })
        .setTitle('Transcription model', 'Transkripsjonsmodell'),
    ),
  )
  .addProperty(
    new CG.prop(
      'tokenUrl',
      new CG.str()
        .optional({ default: 'api/v1/ki-assistent/token' })
        .setTitle('Token endpoint', 'Tokenendepunkt')
        .setDescription('Relative to the app root.', 'Relativt til approten.'),
    ),
  );
