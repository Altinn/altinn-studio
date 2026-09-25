import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { CUSTOM_REACT_COMPONENT_NAME_PATTERN } from 'src/features/customReact/componentName';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Egendefinert React-komponent', en: 'Custom React component' },
    lifecycle: { status: 'beta' },
  },
  capabilities: {
    renderInTable: true,
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
  .addDataModelBinding(
    new CG.obj()
      .optional()
      .additionalProperties(new CG.dataModelBinding())
      .exportAs('IDataModelBindingsForCustomReact'),
  )
  .addProperty(
    new CG.prop(
      'componentName',
      new CG.str()
        .setPattern(CUSTOM_REACT_COMPONENT_NAME_PATTERN)
        .setTitle('Component name', 'Komponentnavn')
        .setDescription(
          'Name of the React component, as registered by the app with window.altinnAppFrontend.registerComponent(). ' +
            'Lowercase words separated by hyphens, for example "my-org-map".',
          'Navnet på React-komponenten, slik appen registrerer den med window.altinnAppFrontend.registerComponent(). ' +
            'Små bokstaver og ord skilt med bindestrek, for eksempel «my-org-map».',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'options',
      new CG.obj()
        .optional()
        .additionalProperties(
          new CG.raw({
            typeScript: 'unknown',
            jsonSchema: {},
            componentCatalog: { type: 'any' },
          }),
        )
        .setTitle('Options', 'Innstillinger')
        .setDescription(
          'Component-specific settings, passed unchanged to the React component as the "options" prop. ' +
            'Values are plain JSON and are not evaluated as expressions.',
          'Innstillinger for komponenten, som sendes uendret til React-komponenten som «options». ' +
            'Verdiene er vanlig JSON og tolkes ikke som uttrykk.',
        )
        .exportAs('CustomReactOptions'),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .allowAdditionalTextResources();
