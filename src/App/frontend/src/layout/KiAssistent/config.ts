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
              new CG.obj(new CG.prop('value', new CG.str()), new CG.prop('label', new CG.str())).exportAs(
                'IKiAlternativ',
              ),
            )
              .optional()
              .setTitle('Options', 'Alternativer'),
          ),
          new CG.prop('flervalg', new CG.bool().optional({ default: false }).setTitle('Multiple choice', 'Flervalg')),
          new CG.prop(
            'maksLengde',
            new CG.int()
              .optional()
              .setTitle('Max length', 'Maksimal lengde')
              .setDescription(
                'Character limit for free text fields. The assistant appends to what is already there, so ' +
                  'without a limit a long conversation produces text the data model rejects on submit.',
                'Tegngrense for fritekstfelt. Assistenten legger til det som alt står, så uten en grense gir ' +
                  'en lang samtale en tekst datamodellen avviser ved innsending.',
              ),
          ),
          new CG.prop(
            'fritekst',
            new CG.bool()
              .optional({ default: false })
              .setTitle('Free text description', 'Fritekstbeskrivelse')
              .setDescription(
                'Marks the field the assistant assesses with vurder_beskrivelse. At most one field.',
                'Merker feltet assistenten vurderer med vurder_beskrivelse. Høyst ett felt.',
              ),
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
          new CG.prop(
            'rettesHos',
            new CG.str()
              .optional()
              .setTitle('Corrected at', 'Rettes hos')
              .setDescription(
                'Where the citizen corrects this, for fields that cannot be corrected here. ' +
                  'Different fields come from different registers, so this belongs on the field.',
                'Der søkeren retter opplysningen, for felter som ikke kan rettes her. ' +
                  'Ulike felter kommer fra ulike registre, så dette hører hjemme på feltet.',
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
      new CG.str().optional({ default: 'gpt-4o-transcribe' }).setTitle('Transcription model', 'Transkripsjonsmodell'),
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
