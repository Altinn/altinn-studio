import { API_CLIENT, APP, ORG } from 'nextsrc/nextpoc/app/App/App';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { initialStateStore } from 'nextsrc/nextpoc/stores/settingsStore';
import { textResourceStore } from 'nextsrc/nextpoc/stores/textResourceStore';

/**
 * Recursively resolves any $ref entries in a JSON schema that point into $defs.
 * Returns a deep copy of the schema with references replaced by their definitions.
 */
export function resolveSchemaDefs(schema: any, root: any = schema): any {
  // If it's not an object or array, just return as is.
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  // If it's a direct reference to something in $defs, resolve it.
  if (schema.$ref && schema.$ref.startsWith('#/$defs/')) {
    const refName = schema.$ref.replace('#/$defs/', '');
    const definition = root.$defs?.[refName];

    if (!definition) {
      throw new Error(`Definition not found for reference: ${schema.$ref}`);
    }

    // Merge the referenced definition with the current node’s additional keys.
    // Then resolve recursively in case the definition itself has nested refs.
    const { $ref, ...rest } = schema;
    return resolveSchemaDefs({ ...definition, ...rest }, root);
  }

  // If it's an array, resolve each item.
  if (Array.isArray(schema)) {
    return schema.map((item) => resolveSchemaDefs(item, root));
  }

  // Otherwise, recursively resolve all object properties.
  const resolved: Record<string, any> = {};
  for (const key of Object.keys(schema)) {
    resolved[key] = resolveSchemaDefs(schema[key], root);
  }

  return resolved;
}

// @ts-ignore
const xsrfCookie = document.cookie
  .split('; ')
  .find((row) => row.startsWith('XSRF-TOKEN='))
  .split('=')[1];
const headers = { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfCookie };

export async function initialLoader() {
  const { user, validParties, applicationMetadata } = initialStateStore.getState();

  const { layoutSetsConfig, setDataModelSchema } = layoutStore.getState();

  const dataModelNames = applicationMetadata.dataTypes
    .filter((dataType) => dataType.allowedContentTypes?.includes('application/xml'))
    .map((dataType) => dataType.id);

  const dataModelSchemaFetches = dataModelNames.map((name) => API_CLIENT.org.jsonschemaDetail(name, ORG, APP));

  const dataModelSchemaResponses = await Promise.all(dataModelSchemaFetches);

  const schemaData = await Promise.all(dataModelSchemaResponses.map(async (res) => await res.json()));

  schemaData.forEach((data, idx) => setDataModelSchema(dataModelNames[idx], resolveSchemaDefs(data)));

  const currentParty = validParties[0];

  if (!currentParty) {
    throw new Error('No valid parties');
  }

  const res = await API_CLIENT.org.activeDetail(ORG, APP, currentParty.partyId);

  const instances = await res.json();
  let instanceId = '';

  if (instances.length > 0) {
    instanceId = instances[0].id;
  } else {
    const res = await API_CLIENT.org.instancesCreate(
      ORG,
      APP,
      {
        instanceOwnerPartyId: currentParty.partyId,
      },
      {
        headers,
      },
    );
    const data = await res.json();

    instanceId = data.id;
  }

  if (!layoutSetsConfig) {
    const res = await API_CLIENT.org.layoutsetsDetail(ORG, APP);
    const data = await res.json();
    layoutStore.getState().setLayoutSets(data);
  }

  const langRes = await API_CLIENT.org.v1TextsDetail(ORG, APP, user.profileSettingPreference.language ?? 'nb');
  const data = await langRes.json();
  textResourceStore.setState({ textResource: data });

  return { instanceId };
}
