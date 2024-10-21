import { allPropertyKeys, generateComponentSchema } from './schemaUtils';
import type { AppFrontendVersion, ComponentName } from './types';
import { isValidVersion } from './version';
import { getLayoutSchema } from './api';
import {
  pushTextResourceBindingKeys,
  allTextResourceBindingKeys,
  logComponentPropertyLabels,
  logTextResourceLabels,
} from './languageUtils';
import { writeToFile } from './fileUtils';

const run = async () => {
  let version: string = process.argv.length > 2 ? process.argv[2] : '';
  if (!isValidVersion(version)) {
    console.warn(
      `Invalid version: ${version}. Please provide a valid version: v3 or v4. Defaulting to v4.`,
    );
    version = 'v4';
  }

  const layoutSchema = await getLayoutSchema(version as AppFrontendVersion);
  const allComponents = layoutSchema.definitions.AnyComponent.properties.type.enum;

  allComponents.forEach((componentName: string) => {
    componentName = componentName === 'AddressComponent' ? 'Address' : componentName;

    const schema = generateComponentSchema(
      componentName as ComponentName,
      layoutSchema,
      version as AppFrontendVersion,
    );
    pushTextResourceBindingKeys(schema);
    writeToFile(componentName as ComponentName, schema, version as AppFrontendVersion);
  });

  const uniqueTextResourceBindingKeys = [...new Set(allTextResourceBindingKeys)];
  logTextResourceLabels(uniqueTextResourceBindingKeys);
  console.log('--------------------------------------------------------');
  logComponentPropertyLabels([...new Set(allPropertyKeys)]);
};

run();
