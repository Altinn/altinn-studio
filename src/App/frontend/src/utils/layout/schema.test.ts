import applicationMetadataSchema from '@app/layout-contract/schemas/json/application/application-metadata.schema.v1.json';
import textResourcesSchema from '@app/layout-contract/schemas/json/text-resources/text-resources.schema.v1.json';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import JsonPointer from 'jsonpointer';
import type { ErrorObject } from 'ajv';

import { ensureAppsDirIsSet, getAllApps } from 'src/test/allApps';

function withValues(targetObject: object) {
  return (err: ErrorObject) => {
    const pointer = JsonPointer.compile(err.instancePath);
    const value = pointer.get(targetObject);
    return { ...err, value };
  };
}

describe('Layout schema (Do not expect all of these tests to pass)', () => {
  describe('All known text resource files should validate against the text resource schema', () => {
    const dir = ensureAppsDirIsSet();
    if (!dir) {
      return;
    }

    const ajv = new Ajv();
    const validate = ajv.compile(textResourcesSchema);

    for (const app of getAllApps(dir)) {
      for (const resources of app.getTextResources()) {
        it(`${app.getName()}/${resources.language}`, () => {
          validate(resources);
          expect((validate.errors || []).map(withValues(resources))).toEqual([]);
        });
      }
    }
  });

  describe('All known applicationmetadata files should validate against the applicationmetadata schema', () => {
    const dir = ensureAppsDirIsSet();
    if (!dir) {
      return;
    }

    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(applicationMetadataSchema);

    for (const app of getAllApps(dir)) {
      it(app.getName(), () => {
        const metadata = app.getAppMetadata();
        validate(metadata);
        expect((validate.errors || []).map(withValues(metadata))).toEqual([]);
      });
    }
  });
});
