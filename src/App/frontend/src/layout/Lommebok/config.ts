import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { credentialTypes } from 'src/layout/Lommebok/types';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Lommebok', en: 'Lommebok' },
    lifecycle: { status: 'beta' },
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
    customExpressions: false,
  },
})
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .addProperty(
    new CG.prop(
      'request',
      new CG.arr(
        new CG.union(
          ...credentialTypes.map(
            (type) =>
              new CG.obj(
                new CG.prop('type', new CG.const(type)),
                new CG.prop('saveToDataType', new CG.str().optional()),
                new CG.prop('alternativeUploadToDataType', new CG.str().optional()),
                new CG.prop(
                  'data',
                  new CG.arr(
                    new CG.obj(
                      new CG.prop('field', new CG.str()),
                      new CG.prop('title', new CG.str()),
                      new CG.prop('displayType', new CG.enum('string', 'date', 'image', 'boolean').optional()),
                    ),
                  ).optional(),
                ),
              ),
          ),
        )
          .setUnionType('discriminated')
          .exportAs('RequestedDocument'),
      ).optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'issue',
      new CG.arr(
        new CG.union(
          ...credentialTypes.map(
            (type) =>
              new CG.obj(
                new CG.prop('type', new CG.const(type)),
                new CG.prop('urlDataType', new CG.str().optional()),
                new CG.prop('urlField', new CG.str()),
                new CG.prop(
                  'data',
                  new CG.arr(
                    new CG.obj(
                      new CG.prop('field', new CG.str()),
                      new CG.prop('title', new CG.str()),
                      new CG.prop('displayType', new CG.enum('string', 'date', 'image', 'boolean').optional()),
                    ),
                  ).optional(),
                ),
              ),
          ),
        )
          .setUnionType('discriminated')
          .exportAs('IssuableDocument'),
      ).optional(),
    ),
  );
