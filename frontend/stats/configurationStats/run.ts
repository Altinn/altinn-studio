import { Layout } from './Layout';
import { LayoutSettings } from './LayoutSettings';
import { ConfigFile } from './ConfigFile';
import { Application } from './Application';
import axios from 'axios';

const calculateAndWriteToConsole = (
  configFileInstance: ConfigFile,
  name: string,
  statsByString: 'property' | 'component' = 'property',
) => {
  console.log('');
  console.log('**********************************************************');
  console.log(`${name} config support by ${statsByString}`);
  console.log('**********************************************************');
  return configFileInstance.calculateMeanPercentageSupportedProperties();
};

const generateLayoutFilesStats = async () => {
  const layoutSchemaResult = await axios.get(
    'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  );
  const layout = new Layout(layoutSchemaResult.data);
  const meanSupportedComponentPropertyPercentage = calculateAndWriteToConsole(
    layout,
    'Layout files',
    'component',
  );
  const componentCount = layout.items.length;

  const layoutSettingsSchemaResult = await axios.get(
    'https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json',
  );
  const layoutSettings = new LayoutSettings(layoutSettingsSchemaResult.data);
  const meanSupportedLayoutSettingsSupport = calculateAndWriteToConsole(
    layoutSettings,
    'LayoutSettings',
  );

  const settingsCount = layoutSettings.items.length;

  // Only the 'sets' property exists in the layout-sets schema, and it is not supported
  const meanSupportedLayoutSetsSuport = 0;
  const layoutSetsItemCount = 1;

  const totalItemCount = componentCount + settingsCount + layoutSetsItemCount;

  console.log('');
  console.log('**********************************************************');
  console.log('Mean results');
  console.log('**********************************************************');

  console.log(
    'Mean supported layout component property config:',
    meanSupportedComponentPropertyPercentage,
    '%',
  );
  console.log('Mean supported layout settings config:', meanSupportedLayoutSettingsSupport, '%');
  console.log('Mean supported layout sets config', meanSupportedLayoutSetsSuport, '%');
  console.log('-----------------------------------------------------');
  console.log(
    'Mean support layout files total: ',
    Math.round(
      (meanSupportedComponentPropertyPercentage * componentCount +
        meanSupportedLayoutSettingsSupport * settingsCount +
        meanSupportedLayoutSetsSuport * layoutSetsItemCount) /
        totalItemCount,
    ),
    '%',
  );
};

const generateApplicationFilesStats = async () => {
  const result = await axios.get(
    'https://altinncdn.no/schemas/json/application/application-metadata.schema.v1.json',
  );
  const application = new Application(result.data);
  calculateAndWriteToConsole(application, 'Application files');
};

const generateStats = async () => {
  console.log('LAYOUT FILES');
  await generateLayoutFilesStats();
  console.log('');
  console.log('APPLICATION METADATA');
  await generateApplicationFilesStats();
};

generateStats()
  .catch((error: any) => {
    console.log('-----------------------------------------------------');
    console.log('Error generating stats');
    console.log(error);
  })
  .finally(() => {
    console.log('-----------------------------------------------------');
    console.log('Done generating stats');
  });
