import dotenv from 'dotenv';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { JSONSchema7 } from 'json-schema';

import { defaultMockDataElementId, getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IFormDynamics } from 'src/features/form/dynamics';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { ILayoutFile, ILayoutSet, ILayoutSets, ILayoutSettings } from 'src/layout/common.generated';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';
import type { IInstance, IProcess } from 'src/types/shared';

export class ExternalApp {
  private compat = false;
  constructor(private rootDir: string) {}

  getName() {
    return path.basename(this.rootDir);
  }

  getOrgApp(): [string, string] {
    try {
      return this.getAppMetadata().id.split('/') as [string, string];
    } catch (_e) {
      const parts = this.getName().split('-', 3);
      return [parts[0], parts[2]];
    }
  }

  private readFile(path: string) {
    return fs.readFileSync(this.rootDir + path, 'utf-8').toString();
  }

  private readJson<T>(path: string) {
    return parseJsonTolerantly<T>(this.readFile(path));
  }

  private fileExists(path: string) {
    try {
      fs.accessSync(this.rootDir + path, fs.constants.R_OK);
      return true;
    } catch (_err) {
      return false;
    }
  }

  private fileSize(path: string) {
    try {
      return fs.statSync(this.rootDir + path).size;
    } catch (_err) {
      return 0;
    }
  }

  private dirExists(path: string) {
    try {
      return fs.statSync(this.rootDir + path).isDirectory();
    } catch (_err) {
      return false;
    }
  }

  readDir(path: string) {
    return fs.readdirSync(this.rootDir + path);
  }

  getBackendVersion(): string | undefined {
    let appFile = '';
    try {
      appFile = this.readFile('/App/App.csproj');
    } catch (_e) {
      return undefined;
    }

    const version = appFile.match(/<PackageReference Include="Altinn.App.Api(.Experimental)?" Version="([^"]*)"/i);
    if (!version) {
      return undefined;
    }

    const v = version[2];
    if (v.match(/^\d+/)) {
      return v;
    }

    // Some use variables, like <PackageReference Include="Altinn.App.Api" Version="$(AltinnAppApiVersion)" />
    // In these cases we need to find the variable and replace it with the actual value
    const propertyName = version[2].match(/\$\(([^)]*)\)/)?.[1];
    const property = propertyName && appFile.match(`<${propertyName}>([^<]*)</${propertyName}>`);
    if (!property) {
      return undefined;
    }

    return property[1];
  }

  getBackendMajorVersion(): number | undefined {
    const version = this.getBackendVersion();
    if (!version) {
      return undefined;
    }
    return parseInt(version.split('.')[0], 10);
  }

  getFrontendVersion(): string | undefined {
    let indexFile = '';
    try {
      indexFile = this.readFile('/App/views/Home/Index.cshtml');
    } catch (_e) {
      return undefined;
    }

    const cleaned = indexFile.replace(/<!--[\s\S]*?-->/g, '').replace(/@[\s\S]*?@/g, '');
    const scriptTags = cleaned.match(/<script src="(.*?)"/g);
    if (!scriptTags) {
      return undefined;
    }

    for (const tag of scriptTags) {
      const url = tag.split('src=')[1].replace(/"/g, '');
      if (!url.startsWith('https://altinncdn.no')) {
        continue;
      }
      const version = url.match(/altinn-app-frontend\/(\d[^/]*)/);
      if (!version) {
        continue;
      }
      return version[1];
    }

    return undefined;
  }

  getFrontendMajorVersion(): number | undefined {
    const version = this.getFrontendVersion();
    if (!version) {
      return undefined;
    }
    return parseInt(version.split('.')[0], 10);
  }

  isValid(): boolean {
    if (!this.dirExists('/App')) {
      return false;
    }
    if (!this.fileExists('/App/config/applicationmetadata.json')) {
      return false;
    }
    if (!this.fileExists('/App/views/Home/Index.cshtml')) {
      return false;
    }
    if (!this.fileExists('/App/ui/layout-sets.json')) {
      return false;
    }

    const indexFile = this.readFile('/App/views/Home/Index.cshtml');
    return !!indexFile.match(/altinn-app-frontend\/4.*?\/altinn-app-frontend\.js/);
  }

  isValidLayoutSet(setId: string): boolean {
    if (!this.dirExists(`/App/ui/${setId}/layouts`)) {
      return false;
    }
    return this.fileExists(`/App/ui/${setId}/Settings.json`);
  }

  isValidDataModel(fileBase: string, typeId: string): boolean {
    if (!this.fileExists(`/App/models/${fileBase}.schema.json`)) {
      return false;
    }
    if (!this.fileExists(`/App/models/${fileBase}.cs`)) {
      return false;
    }

    const metadata = this.getAppMetadata();
    const data = metadata.dataTypes.find((dt) => dt.id === typeId);
    if (!data) {
      return false;
    }
    return !!data.appLogic?.classRef;
  }

  /**
   * Enabling this will overwrite some of the application config in order to allow tests to run this app without
   * having to deal with intricacies like:
   *  1. All party types are allowed, no party selection
   *  2. No instance selection on entry
   */
  enableCompatibilityMode() {
    this.compat = true;
    return this;
  }

  getAppMetadata(): IncomingApplicationMetadata {
    const appMetaData = this.readJson<IncomingApplicationMetadata>('/App/config/applicationmetadata.json');
    if (this.compat) {
      appMetaData.altinnNugetVersion = '8.5.0.157';
      appMetaData.partyTypesAllowed = {
        subUnit: true,
        person: true,
        bankruptcyEstate: true,
        organisation: true,
      };

      // We delete this for multiple reasons:
      // 1. When testing, we don't want to end up in instance selection
      // 2. We pretend stateless isn't a thing. If apps are considered stateless, we can end up with useNavigatePage()
      //    redirecting us to a page we didn't want.
      appMetaData.onEntry = undefined;
    }
    return appMetaData;
  }

  getTextResources(): ITextResourceResult[] {
    const textRoot = '/App/config/texts';
    const out: ITextResourceResult[] = [];
    if (!this.dirExists(textRoot)) {
      return out;
    }

    for (const file of this.readDir(textRoot)) {
      if (file.match(/^resource\.\w+\.json$/)) {
        out.push(this.readJson<ITextResourceResult>(`${textRoot}/${file}`));
      }
    }

    return out;
  }

  getRuleHandler(layoutSetId: string): string {
    const path = `/App/ui/${layoutSetId}/RuleHandler.js`;
    if (!this.fileExists(path)) {
      return '';
    }
    return this.readFile(path);
  }

  getRuleConfiguration(layoutSetId: string): { data: IFormDynamics } | null {
    const path = `/App/ui/${layoutSetId}/RuleConfiguration.json`;
    if (!this.fileExists(path) || this.fileSize(path) === 0) {
      return null;
    }

    return this.readJson<{ data: IFormDynamics }>(path);
  }

  getRawLayoutSets(): ILayoutSets {
    const out = this.readJson<ILayoutSets>('/App/ui/layout-sets.json');

    for (const set of out.sets) {
      if (this.compat && !set.tasks) {
        // Fixing compatibility with stateless apps, so they can run in stateful modes
        set.tasks = ['Task_1'];
      }
    }

    return out;
  }

  getLayoutSets(): ExternalAppLayoutSet[] {
    const raw = this.getRawLayoutSets();
    return raw.sets.map((set) => new ExternalAppLayoutSet(this, set.id, set));
  }

  getLayoutSet(setId: string): ExternalAppLayoutSet {
    const set = this.getRawLayoutSets().sets.find((s) => s.id === setId);
    if (!set) {
      throw new Error(`Layout set '${setId}' not found`);
    }
    return new ExternalAppLayoutSet(this, setId, set);
  }

  getRawLayoutSet(setId: string): ILayoutCollection {
    const layoutsDir = `/App/ui/${setId}/layouts`;
    if (!this.dirExists(layoutsDir)) {
      throw new Error(`Layout set '${setId}' folder not found`);
    }
    const set = this.getRawLayoutSets().sets.find((s) => s.id === setId);

    const collection: ILayoutCollection = {};
    for (const file of this.readDir(layoutsDir)) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const pageKey = file.replace('.json', '');
      collection[pageKey] = this.readJson<ILayoutFile>(`${layoutsDir}/${file}`);
      collection[pageKey].data.layout = cleanLayout(collection[pageKey].data.layout, set?.dataType ?? 'unknown');
    }

    return collection;
  }

  getLayoutSetSettings(setId: string): ILayoutSettings {
    const settingsFile = `/App/ui/${setId}/Settings.json`;
    if (!this.fileExists(settingsFile)) {
      throw new Error(`Layout set '${setId}' settings file not found`);
    }

    return this.readJson<ILayoutSettings>(settingsFile);
  }

  getDataModelsFromMetaData(): ExternalAppDataModel[] {
    const out: ExternalAppDataModel[] = [];
    const folder = '/App/models';
    const folderContents = this.readDir(folder);
    const metaData = this.getAppMetadata();

    for (const dataType of metaData.dataTypes) {
      const schemaFile = folderContents.find((file) => file.match(new RegExp(`^${dataType.id}\\.schema\\.json$`, 'i')));
      if (schemaFile && dataType.appLogic?.classRef && !out.some((model) => model.getName() === dataType.id)) {
        const fileBase = schemaFile.replace(/\.schema\.json$/, '');
        const model = new ExternalAppDataModel(this, dataType.id, fileBase);
        out.push(model);
      }
    }

    return out;
  }

  getDataModelsFromLayoutSets(): ExternalAppDataModel[] {
    const out: ExternalAppDataModel[] = [];
    for (const layoutSet of this.getLayoutSets()) {
      if (layoutSet.isValid()) {
        out.push(layoutSet.getModel());
      }
    }
    return out;
  }

  getModelSchema(fileBase: string): JSONSchema7 {
    const schemaFile = `/App/models/${fileBase}.schema.json`;
    if (!this.fileExists(schemaFile)) {
      throw new Error(`Model schema '${fileBase}' file not found`);
    }

    return this.readJson<JSONSchema7>(schemaFile);
  }
}

export class ExternalAppLayoutSet {
  constructor(
    public readonly app: ExternalApp,
    private id: string,
    private config: ILayoutSet,
  ) {}

  getName() {
    return this.id;
  }

  isValid(): boolean {
    // A layout-set must have a dataType to be valid, and that dataType must be in applicationmetadata
    if (!this.config.dataType) {
      return false;
    }

    if (!this.app.isValidLayoutSet(this.id)) {
      return false;
    }

    try {
      const metadata = this.app.getAppMetadata();
      return !!metadata?.dataTypes.find((element) => element.id === this.config.dataType);
    } catch (_e) {
      return false;
    }
  }

  getLayouts() {
    return this.app.getRawLayoutSet(this.id);
  }

  getSettings() {
    return this.app.getLayoutSetSettings(this.id);
  }

  getModel(identifier?: { url: string } | { name: string }): ExternalAppDataModel {
    let model: ExternalAppDataModel | undefined;
    if (!identifier) {
      const folderContents = this.app.readDir('/App/models');
      const schemaFile = folderContents.find((file) =>
        file.match(new RegExp(`^${this.config.dataType}\\.schema\\.json$`, 'i')),
      );
      if (!schemaFile) {
        throw new Error('Data model schema not found');
      }
      const fileBase = schemaFile.replace(/\.schema\.json$/, '');
      model = new ExternalAppDataModel(this.app, this.config.dataType, fileBase, this);
    } else {
      const models = this.app.getDataModelsFromMetaData();
      if ('url' in identifier) {
        const match = identifier.url.match(/fakeUuid:(.*):end/);
        assert(match);
        model = models.find((model) => model.getName() === decodeURIComponent(match[1]));
      } else {
        model = models.find((model) => model.getName() === identifier.name);
      }
      if (!model) {
        throw new Error('Data model not found');
      }
      model.setLayoutSet(this);
    }

    return model;
  }

  getRuleHandler() {
    return this.app.getRuleHandler(this.id);
  }

  getRuleConfiguration() {
    return this.app.getRuleConfiguration(this.id);
  }

  simulateInstance(): IInstance {
    return getInstanceDataMock((i) => {
      const defaultData = i.data.find((d) => d.id === defaultMockDataElementId);
      assert(defaultData);
      i.data = i.data.filter((d) => d.id !== defaultMockDataElementId);

      // Add one data element per data model in this app
      const models = this.app.getDataModelsFromMetaData();
      for (const model of models) {
        i.data.push({
          ...defaultData,
          id: `fakeUuid:${model.getName()}:end`,
          dataType: model.getName(),
        });
      }
    });
  }

  getTaskId(): string {
    const firstTask = this.config.tasks?.[0];
    return firstTask ?? 'Task_1'; // Fallback to simulate Task_1 for stateless apps
  }

  initialize(): { hash: string; mainSet: ExternalAppLayoutSet; subformComponent?: CompExternal<'Subform'> } {
    const instance = getInstanceDataMock();
    const pageSettings = this.getSettings().pages;
    const firstPage = 'order' in pageSettings ? pageSettings.order[0] : pageSettings.groups[0].order[0];

    let hash = `#/instance/${instance.instanceOwner.partyId}/${instance.id}`;
    let mainSet: ExternalAppLayoutSet | undefined;
    let subformComponent: CompExternal<'Subform'> | undefined = undefined;

    for (const otherSet of this.app.getLayoutSets()) {
      for (const page of Object.values(otherSet.getLayouts())) {
        for (const component of page.data.layout) {
          if (component.type === 'Subform' && component.layoutSet === this.getName()) {
            mainSet = otherSet;
            subformComponent = component;
            break;
          }
        }
      }
      if (mainSet && subformComponent) {
        break;
      }
    }

    if (!mainSet || !subformComponent) {
      // No other layout set includes us as a subform, we must be the main form.
      hash += `/${this.getTaskId()}/${firstPage}`;
      return { hash, mainSet: this };
    }

    // From here on out, we're in a subform
    const mainPages = mainSet.getSettings().pages;
    const firstMainPage = 'order' in mainPages ? mainPages.order[0] : mainPages.groups[0].order[0];
    const elementId = `fakeUuid:${this.config.dataType}:end`;
    hash += `/${mainSet.getTaskId()}/${firstMainPage}/${subformComponent.id}/${elementId}/${firstPage}`;

    return { hash, mainSet, subformComponent };
  }

  simulateProcessData(): IProcess {
    const taskId = this.getTaskId();
    return getProcessDataMock((process) => {
      assert(process.currentTask?.elementId === 'Task_1');
      process.currentTask.elementId = taskId;
      process.currentTask.name = taskId;
      assert(process.processTasks?.[0]?.elementId === 'Task_1');
      process.processTasks[0].elementId = taskId;
    });
  }
}

export class ExternalAppDataModel {
  constructor(
    public readonly app: ExternalApp,
    private dataType: string,
    private baseFileName: string,
    public layoutSet?: ExternalAppLayoutSet,
  ) {}

  getName(): string {
    return this.dataType;
  }

  setLayoutSet(layoutSet: ExternalAppLayoutSet) {
    this.layoutSet = layoutSet;
  }

  isValid(): boolean {
    return this.app.isValidDataModel(this.baseFileName, this.dataType);
  }

  getSchema() {
    return this.app.getModelSchema(this.baseFileName);
  }

  getDataDef() {
    const metadata = this.app.getAppMetadata();
    return metadata.dataTypes.find((dt) => dt.id === this.dataType)!;
  }

  simulateDataModel(numRows = 1, _layouts?: ILayoutCollection): unknown {
    const dataModel = {};
    const layouts = _layouts ?? this.layoutSet?.getLayouts();
    if (!layouts) {
      throw new Error('No layouts provided');
    }

    const groupsNeeded: string[] = [];
    for (const page of Object.keys(layouts)) {
      for (const comp of layouts[page].data.layout) {
        if (comp.type === 'RepeatingGroup' && comp.dataModelBindings?.group) {
          groupsNeeded.push(comp.dataModelBindings.group.field);
        }
        if (comp.type === 'Likert' && comp.dataModelBindings?.questions) {
          groupsNeeded.push(comp.dataModelBindings.questions.field);
        }
      }
    }

    // Sort groupsNeeded by length to make sure the upper repeating groups are added before the lower/inner levels
    groupsNeeded.sort((a, b) => a.length - b.length);

    // Add N rows per repeating group
    for (const binding of groupsNeeded) {
      const parts = binding.split('.');
      if (parts.length) {
        const part = parts.shift()!;
        this.buildDataModel(dataModel, part, parts, numRows);
      }
    }

    return dataModel;
  }

  private buildDataModel(current: object, key: string, bindingParts: string[], numRows: number) {
    if (!bindingParts.length) {
      if (!current[key]) {
        current[key] = [];
        for (let i = 0; i < numRows; i++) {
          current[key].push({ [ALTINN_ROW_ID]: uuidv4() });
        }
      }
    } else if (current[key] && Array.isArray(current[key])) {
      const nextKey = bindingParts.shift()!;
      for (const row of current[key]) {
        this.buildDataModel(row, nextKey, bindingParts, numRows);
      }
      this.buildDataModel(current, nextKey, bindingParts, numRows);
    } else {
      if (!current[key]) {
        current[key] = {};
      }
      const nextKey = bindingParts.shift()!;
      this.buildDataModel(current[key], nextKey, bindingParts, numRows);
    }
  }
}

/**
 * Get all apps, as a list of paths
 */
export function getAllApps(dir: string): ExternalApp[] {
  const out: ExternalApp[] = [];
  const apps = fs.readdirSync(dir);
  for (const app of apps) {
    if (app.startsWith('.')) {
      continue;
    }

    out.push(new ExternalApp(path.join(dir, app)));
  }

  return out;
}

/**
 * Utility function used to get the path to a directory containing all known apps.
 * Only call this from unit tests, and be sure to stop the test if it fails.
 */
export function ensureAppsDirIsSet(runVoidTest = true) {
  const env = dotenv.config({ quiet: true });
  const dir = env.parsed?.ALTINN_ALL_APPS_DIR;
  if (!dir) {
    if (runVoidTest) {
      it('did not find any apps', () => {
        expect(true).toBeTruthy();
      });
    }

    console.warn(
      'ALTINN_ALL_APPS_DIR should be set, please create a .env file and point it to a directory containing all known apps',
    );
    return false;
  }

  return dir;
}

/**
 * Parse JSON that may contain comments, trailing commas, etc.
 */
function parseJsonTolerantly<T = unknown>(content: string): T {
  // Remove multiline comments
  content = content.replace(/\/\*([\s\S]*?)\*\//g, '');

  // Remove single-line comments, but not in strings
  content = content.replace(/^(.*?)\/\/(.*)$/gm, (_, m1, m2) => {
    const quoteCount = m1.split(/(?<!\\)"/).length - 1;
    if (quoteCount % 2 === 0) {
      return m1;
    }

    return `${m1}//${m2}`;
  });

  // Remove trailing commas
  content = content.replace(/,\s*([\]}])/g, '$1');

  // Remove zero-width spaces, non-breaking spaces, etc.
  content = content.replace(/[\u200B-\u200D\uFEFF]/g, '');

  try {
    return JSON.parse(content);
  } catch (e) {
    const position = e.message.match(/position (\d+)/);
    if (position) {
      const pos = parseInt(position[1], 10);
      const before = content.substring(0, pos);
      const line = before.split('\n').length;
      const column = before.split('\n').pop()?.length ?? 0;
      throw new Error(`${e.message} (line ${line}, column ${column})`);
    }

    throw new Error(`Failed to parse JSON: ${e.message}`);
  }
}
