import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

/**
 * En samtale som eier sekvensen selv: ett spørsmål om gangen, mikrofon på hvert steg,
 * og ingen navigasjonsknapper. Stegene defineres i layouten, ikke i koden, slik at
 * komponenten kan gjenbrukes til andre skjemaer enn TT-kort.
 */
export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Samtale', en: 'Conversation' },
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
      'steg',
      new CG.arr(
        new CG.obj(
          new CG.prop('id', new CG.str().setTitle('Step id', 'Steg-id')),
          new CG.prop(
            'binding',
            new CG.dataModelBinding().setTitle('Data model binding', 'Datamodellbinding'),
          ),
          new CG.prop('sporsmaal', new CG.str().setTitle('Question text resource', 'Tekstressurs for spørsmålet')),
          new CG.prop(
            'hjelp',
            new CG.str().optional().setTitle('Help text resource', 'Tekstressurs for hjelpetekst'),
          ),
          new CG.prop(
            'alternativer',
            new CG.arr(
              new CG.obj(
                new CG.prop('value', new CG.str()),
                new CG.prop('label', new CG.str()),
              ).exportAs('ISamtaleAlternativ'),
            )
              .optional()
              .setTitle('Options', 'Alternativer')
              .setDescription(
                'When present the step is a single choice. Without options the step is free text.',
                'Når denne finnes er steget et enkeltvalg. Uten alternativer er steget fritekst.',
              ),
          ),
          new CG.prop(
            'valgfritt',
            new CG.bool().optional({ default: false }).setTitle('Optional', 'Valgfritt'),
          ),
          new CG.prop(
            'avsluttVerdi',
            new CG.str()
              .optional()
              .setTitle('Ends the conversation', 'Avslutter samtalen')
              .setDescription(
                'When the step has this value the conversation is complete, and later steps are skipped and not required.',
                'Når steget har denne verdien er samtalen ferdig, og senere steg hoppes over og kreves ikke.',
              ),
          ),
        ).exportAs('ISamtalesteg'),
      ).setTitle('Steps', 'Steg'),
    ),
  )
  .addProperty(
    new CG.prop(
      'sprak',
      new CG.str()
        .optional({ default: 'nb-NO' })
        .setTitle('Speech recognition language', 'Språk for talegjenkjenning')
        .setDescription('BCP 47 language tag, e.g. nb-NO.', 'BCP 47-språkkode, for eksempel nb-NO.'),
    ),
  );
