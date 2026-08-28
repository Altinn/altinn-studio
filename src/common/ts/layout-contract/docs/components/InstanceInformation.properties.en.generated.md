The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                           | Type                           | Required | Default | Description                                                    |
| ---------------------------------- | ------------------------------ | -------- | ------- | -------------------------------------------------------------- |
| `labelSettings`                    | `object`                       | No       |         | Controls how the component label is displayed.                 |
| `labelSettings.optionalIndicator`  | `boolean`                      | No       |         | Show optional indicator on label                               |
| `type`                             | `"InstanceInformation"`        | Yes      |         | Identifies which component type this configuration represents. |
| `elements`                         | `object`                       | No       |         | Which elements to show in the instance information             |
| `elements.dateSent`                | `boolean`                      | No       |         |                                                                |
| `elements.sender`                  | `boolean`                      | No       |         |                                                                |
| `elements.receiver`                | `boolean`                      | No       |         |                                                                |
| `elements.referenceNumber`         | `boolean`                      | No       |         |                                                                |
| `textResourceBindings`             | `object`                       | No       |         | Connects component texts to text resources or expressions.     |
| `textResourceBindings.title`       | `string \| expression<string>` | No       |         | Label text/title shown above the component                     |
| `textResourceBindings.description` | `string \| expression<string>` | No       |         | Label description shown above the component, below the title   |
| `textResourceBindings.help`        | `string \| expression<string>` | No       |         | Help text shown in a tooltip when clicking the help button     |
