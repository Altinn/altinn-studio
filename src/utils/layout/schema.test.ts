import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import dotenv from 'dotenv';
import deepEqual from 'fast-deep-equal';
import JsonPointer from 'jsonpointer';
import fs from 'node:fs';
import applicationMetadataSchema from 'schemas/json/application/application-metadata.schema.v1.json';
import numberFormatSchema from 'schemas/json/component/number-format.schema.v1.json';
import expressionSchema from 'schemas/json/layout/expression.schema.v1.json';
import layoutSchema from 'schemas/json/layout/layout.schema.v1.json';
import textResourcesSchema from 'schemas/json/text-resources/text-resources.schema.v1.json';
import type { ErrorObject } from 'ajv';

import { getAllApps, getAllLayoutSets } from 'src/utils/layout/getAllLayoutSets';
import type { CompTypes } from 'src/layout/layout';

function withValues(targetObject: any) {
  return (err: ErrorObject) => {
    const pointer = JsonPointer.compile(err.instancePath);
    const value = pointer.get(targetObject);
    return { ...err, value };
  };
}

describe('Layout schema', () => {
  describe('All schemas should be valid', () => {
    const recurse = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (fs.lstatSync(`${dir}/${file}`).isDirectory()) {
          recurse(`${dir}/${file}`);
          continue;
        }

        if (!file.endsWith('.json')) {
          continue;
        }

        it(`${dir}/${file} should be parseable as JSON`, () => {
          const content = fs.readFileSync(`${dir}/${file}`, 'utf-8');
          expect(() => JSON.parse(content)).not.toThrow();

          const schema = JSON.parse(content);
          const ajv = new Ajv();
          expect(ajv.validateSchema(schema)).toBeTruthy();
        });
      }
    };

    recurse('schemas');
  });

  describe('All known layout sets should validate against the layout schema', () => {
    const env = dotenv.config();
    const dir = env.parsed?.ALTINN_ALL_APPS_DIR;
    if (!dir) {
      it('did not find any apps', () => {
        expect(true).toBeTruthy();
      });
      console.warn(
        'ALTINN_ALL_APPS_DIR should be set, please create a .env file and point it to a directory containing all known apps',
      );
      return;
    }

    const ajv = new Ajv({
      strict: false,
      schemas: [expressionSchema, numberFormatSchema],
    });
    const validate = ajv.compile(layoutSchema);
    const allLayoutSets = getAllLayoutSets(dir);

    for (const { appName, setName, entireFiles } of allLayoutSets) {
      for (const layoutName of Object.keys(entireFiles)) {
        const layout = entireFiles[layoutName];
        it(`${appName}/${setName}/${layoutName}`, () => {
          validate(layout);
          const errors = validate.errors || [];
          const errorMap = errorsToMap(errors.map(withValues(layout)));
          removeCommonLayoutErrors(errorMap, layout);
          removeEmptyPaths(errorMap);
          expect(errorMap).toEqual({});
        });
      }
    }
  });

  describe('All known text resource files should validate against the text resource schema', () => {
    const env = dotenv.config();
    const dir = env.parsed?.ALTINN_ALL_APPS_DIR;
    if (!dir) {
      it('did not find any apps', () => {
        expect(true).toBeTruthy();
      });
      console.warn(
        'ALTINN_ALL_APPS_DIR should be set, please create a .env file and point it to a directory containing all known apps',
      );
      return;
    }

    const ajv = new Ajv();
    const validate = ajv.compile(textResourcesSchema);

    for (const app of getAllApps(dir)) {
      const folder = `${dir}/${app}/App/config/texts/`;
      if (!fs.existsSync(folder)) {
        continue;
      }
      const resourceFiles = fs.readdirSync(folder);
      for (const resourceFile of resourceFiles) {
        if (!resourceFile.match(/^resource\.[a-z]{2}\.json$/)) {
          continue;
        }
        let resources: any;
        try {
          const content = fs.readFileSync(`${folder}/${resourceFile}`, 'utf-8');
          resources = JSON.parse(content);
        } catch (e) {
          console.error(`Failed to parse ${folder}/${resourceFile}`, e);
          continue;
        }

        it(`${app}/${resourceFile}`, () => {
          validate(resources);
          expect((validate.errors || []).map(withValues(resources))).toEqual([]);
        });
      }
    }
  });

  describe('All known applicationmetadata files should validate against the applicationmetadata schema', () => {
    const env = dotenv.config();
    const dir = env.parsed?.ALTINN_ALL_APPS_DIR;
    if (!dir) {
      it('did not find any apps', () => {
        expect(true).toBeTruthy();
      });
      console.warn(
        'ALTINN_ALL_APPS_DIR should be set, please create a .env file and point it to a directory containing all known apps',
      );
      return;
    }

    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(applicationMetadataSchema);

    for (const app of getAllApps(dir)) {
      const metaDataFile = `${dir}/${app}/App/config/applicationmetadata.json`;
      if (!fs.existsSync(metaDataFile)) {
        continue;
      }
      let metadata: any;
      try {
        const content = fs.readFileSync(metaDataFile, 'utf-8');
        metadata = JSON.parse(content);
      } catch (e) {
        console.error(`Failed to parse ${metaDataFile}`, e);
        continue;
      }

      it(metaDataFile, () => {
        validate(metadata);
        expect((validate.errors || []).map(withValues(metadata))).toEqual([]);
      });
    }
  });
});

interface ErrorMap {
  [path: string]: (ErrorObject | undefined)[];
}

function errorsToMap(errors: ErrorObject[]): ErrorMap {
  const map: ErrorMap = {};
  for (const error of errors) {
    const path = error.instancePath;
    if (!map[path]) {
      map[path] = [];
    }
    map[path].push(error);
  }
  return map;
}

const componentPathRegexWithEnd = /^\/data\/layout\/\d+$/;
const componentPathRegex = /^\/data\/layout\/\d+/;

function removeCommonLayoutErrors(obj: ErrorMap, target: any) {
  for (const path of Object.keys(obj)) {
    const errors = obj[path];
    for (const idx in errors) {
      const error = errors[idx];
      if (!error) {
        continue;
      }

      const isComponent = error.instancePath.match(componentPathRegexWithEnd);
      const componentPath = error.instancePath.match(componentPathRegex);
      const value = JsonPointer.get(target, error.instancePath);
      const componentValue = componentPath
        ? JsonPointer.get(target, componentPath[0])
        : isComponent
        ? value
        : undefined;
      const componentType: CompTypes = componentValue ? componentValue.type : undefined;

      if (componentType) {
        // Sets the component type in the error message so that it's easier for us to find out what's wrong
        (error as any).componentType = componentType;
      }

      if (error.instancePath.endsWith('/id') && error.message?.startsWith('must match pattern')) {
        // Ignore errors about id not matching pattern. This is common, and we don't care that much about it.
        errors[idx] = undefined;
      }

      if (componentType === 'Header' && error.message?.startsWith("must have required property 'size'")) {
        errors[idx] = undefined;
      }

      if (error.keyword === 'if' && error.message === 'must match "then" schema') {
        // This is a generic error just indicating that the component is not valid. It points to other errors, so
        // we'll care about those instead.
        errors[idx] = undefined;
      }

      if (
        isComponent &&
        error.keyword === 'additionalProperties' &&
        ['dataModelBindings', 'textResourceBindings', 'componentType'].includes(error.params.additionalProperty)
      ) {
        // Ignore errors about additional properties for components that does not use these properties.
        errors[idx] = undefined;
      }

      if (error.instancePath.endsWith('/optionsId') && value === null) {
        errors[idx] = undefined;
      }

      // These are all slight misconfigurations of the Group component, causing it to not be recognized as one of the
      // sub-types of Group.
      const wrongGroupTypeErrors = [
        "must have required property 'maxCount'",
        "must have required property 'panel'",
        "must have required property 'edit'",
        "must have required property 'dataModelBindings'",
        'must match a schema in anyOf',
      ];
      if (isComponent && componentType === 'Group' && wrongGroupTypeErrors.includes(error.message || '')) {
        errors[idx] = undefined;
      }
      if (
        !isComponent &&
        error.instancePath.endsWith('/dataModelBindings') &&
        error.message === "must have required property 'group'" &&
        componentValue &&
        componentValue.type === 'Group'
      ) {
        errors[idx] = undefined;
      }
      if (
        isComponent &&
        componentType === 'Group' &&
        error.keyword === 'additionalProperties' &&
        error.params.additionalProperty === 'triggers'
      ) {
        errors[idx] = undefined;
      }

      const commonSuperfluousTrb = ['title'];
      if (
        error.keyword === 'additionalProperties' &&
        error.instancePath.endsWith('/textResourceBindings') &&
        commonSuperfluousTrb.includes(error.params.additionalProperty)
      ) {
        errors[idx] = undefined;
      }

      if (
        isComponent &&
        error.keyword === 'additionalProperties' &&
        error.params.additionalProperty === 'size' &&
        (componentType === 'Paragraph' || componentType === 'Panel')
      ) {
        errors[idx] = undefined;
      }

      if (error.instancePath.match(/\/grid\/[a-z][a-z]$/) && typeof value === 'string') {
        errors[idx] = undefined;
      }

      if (error.instancePath.endsWith('/dataModelBindings') && deepEqual(value, {})) {
        errors[idx] = undefined;
      }

      if (
        error.keyword === 'additionalProperties' &&
        error.params.additionalProperty === 'readOnly' &&
        ['Header', 'Group'].includes(componentType)
      ) {
        errors[idx] = undefined;
      }

      if (
        error.keyword === 'additionalProperties' &&
        error.params.additionalProperty === 'required' &&
        ['Header', 'Paragraph', 'NavigationButtons', 'Summary', 'Image', 'Group'].includes(componentType)
      ) {
        errors[idx] = undefined;
      }

      if (
        isComponent &&
        (componentType === 'FileUpload' || componentType === 'FileUploadWithTag') &&
        error.keyword === 'additionalProperties' &&
        error.params.additionalProperty === 'description'
      ) {
        errors[idx] = undefined;
      }
    }
  }
}

function removeEmptyPaths(obj: ErrorMap) {
  for (const path of Object.keys(obj)) {
    obj[path] = obj[path].filter((error) => error !== undefined);
    if (obj[path].length === 0) {
      delete obj[path];
    }
  }
}
