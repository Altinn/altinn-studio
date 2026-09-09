import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { asAttachmentUploader } from 'src/features/attachments/config';
import { ExprVal } from 'src/features/expressions/types';
import { asOptionsComponent } from 'src/features/options/config';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';

export const Config = asOptionsComponent(
  asUploaderComponent(
    new CG.component({
      category: CompCategory.Form,
      availability: 'configurable',
      metadata: {
        name: { nb: 'Vedlegg', en: 'FileUpload' },
        lifecycle: { status: 'stable' },
      },
      capabilities: {
        renderInTable: false,
        renderInButtonGroup: false,
        renderInAccordion: true,
        renderInAccordionGroup: false,
        renderInCards: true,
        renderInCardsMedia: false,
        renderInTabs: true,
      },
      functionality: {
        customExpressions: true,
      },
    }),
  ).addTextResource(
    new CG.trb({
      name: 'tagTitle',
      title: { en: 'Tag title', nb: 'Ledetekst for tagg' },
      description: {
        en: 'The title to show when selecting a tag for each uploaded file',
        nb: 'Ledeteksten som vises når brukeren velger en tagg for hver opplastede fil.',
      },
    }),
  ),
  { supportsPreselection: false },
);

export function asUploaderComponent(config: ComponentConfig) {
  return asAttachmentUploader(config)
    .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional())
    .addDataModelBinding(CG.common('IDataModelBindingsList').optional())
    .addProperty(
      new CG.prop(
        'maxFileSizeInMB',
        new CG.int()
          .setTitle('Max file size (MB)', 'Maksimal filstørrelse (MB)')
          .setDescription(
            'Sets the maximum file size allowed in megabytes',
            'Angir maksimal tillatt filstørrelse i megabyte.',
          ),
      ),
    )
    .addProperty(
      new CG.prop(
        'maxNumberOfAttachments',
        new CG.expr(ExprVal.Number)
          .setTitle('Max number of attachments', 'Maksimalt antall vedlegg')
          .setDescription(
            'Sets the maximum number of attachments allowed to upload',
            'Angir maksimalt antall vedlegg brukeren kan laste opp.',
          ),
      ),
    )
    .addProperty(
      new CG.prop(
        'minNumberOfAttachments',
        new CG.expr(ExprVal.Number)
          .setTitle('Min number of attachments', 'Minste antall vedlegg')
          .setDescription(
            'Sets the minimum number of attachments required to upload',
            'Angir minste antall vedlegg brukeren må laste opp.',
          ),
      ),
    )
    .addProperty(new CG.prop('displayMode', new CG.enum('simple', 'list')))
    .addProperty(
      new CG.prop(
        'hasCustomFileEndings',
        new CG.bool()
          .optional({ default: false })
          .setTitle('Has custom file endings', 'Har egendefinerte filendelser')
          .setDescription(
            'Boolean value indicating if the component has valid file endings',
            'Angir om komponenten har gyldige filendelser.',
          ),
      ),
    )
    .addProperty(
      new CG.prop(
        'validFileEndings',
        new CG.union(new CG.str(), new CG.arr(new CG.str()))
          .optional()
          .setTitle('Valid file endings', 'Tillatte filendelser')
          .setDescription(
            'A separated string of valid file endings to upload. If not set all endings are accepted.',
            'En kommaseparert liste over tillatte filendelser. Alle filendelser godtas hvis egenskapen ikke er satt.',
          )
          .addExample('.csv', '.doc', '.docx', '.gif', '.jpeg', '.pdf', '.txt'),
      ),
    )
    .addProperty(
      new CG.prop(
        'alertOnDelete',
        new CG.expr(ExprVal.Boolean)
          .optional({ default: false })
          .setTitle('Alert on delete', 'Varsel ved sletting')
          .setDescription(
            'Boolean value indicating if warning popup should be displayed when attempting to delete an element',
            'Angir om en advarsel skal vises når brukeren prøver å slette et element.',
          ),
      ),
    )
    .extends(CG.common('LabeledComponentProps'))
    .extendTextResources(CG.common('TRBLabel'));
}
