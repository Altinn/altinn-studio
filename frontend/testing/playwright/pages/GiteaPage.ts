import type { LanguageCode } from '../enum/LanguageCode';
import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import { type BpmnTaskType } from '../types/BpmnTaskType';
import { expect } from '@playwright/test';

// Since this page is Gitea's page, it's not using the nb/en.json files, which are used in the frontend.
const giteaPageTexts: Record<string, string> = {
  app: 'App',
  ui: 'ui',
  layoutSetFolderName: 'form',
  layouts: 'layouts',
  dataModelBindings: 'dataModelBindings',
  config: 'config',
  texts: 'texts',
  process: 'process',
  applicationmetadata: 'applicationmetadata',
};

export class GiteaPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async verifyGiteaPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('gitea'));
  }

  public async clickOnAppFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['app'], exact: true }).click();
  }

  public async clickOnUiFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['ui'], exact: true }).click();
  }

  public async clickOnLayoutSetsFolder(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['layoutSetFolderName'] }).click();
  }

  public async clickOnLayoutsFilesFolder(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['layouts'] }).click();
  }

  public async verifyThatTheNewPageIsNotPresent(pageName: string): Promise<void> {
    await this.page.getByRole('link', { name: `${pageName}.json` }).isHidden();
  }

  public async verifyThatTheNewPageIsPresent(pageName: string): Promise<void> {
    await this.page.getByRole('link', { name: `${pageName}.json` }).isVisible();
  }

  public async goBackNPages(nPages: number): Promise<void> {
    for (let i = 0; i < nPages; i++) {
      await this.page.goBack();
    }
  }

  public async clickOnLayoutJsonFile(pageName: string): Promise<void> {
    await this.page.getByRole('link', { name: `${pageName}.json` }).click();
  }

  public async verifyThatDataModelBindingsAreNotPresent(): Promise<void> {
    await this.page.getByText(giteaPageTexts['dataModelBindings']).isHidden();
  }

  public async verifyThatDataModelBindingsAreVisible(dataModelBinding: string): Promise<void> {
    // Todo: Check the JSON structure directly instead: https://github.com/Altinn/altinn-studio/issues/13216
    await this.page.getByText(giteaPageTexts['dataModelBindings']).first().isVisible();
    await this.page.getByText(dataModelBinding, { exact: true }).isVisible();
  }

  public async verifyThatComponentIdIsVisible(id: string): Promise<void> {
    await this.page.getByText(`"id": "${id}"`).isVisible();
  }

  public async verifyThatTextResourceBindingsTitleIsVisible(title: string): Promise<void> {
    await this.page
      .getByText(`"textResourceBindings": { "title": "${title}" }`, { exact: true })
      .isVisible();
  }

  public async clickOnConfigFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['config'] }).click();
  }

  public async clickOnTextFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['texts'] }).click();
  }

  public async verifyThatResourceJsonFileIsVisible(lang: LanguageCode): Promise<void> {
    await this.page.getByRole('link', { name: `resource.${lang}.json`, exact: true }).isVisible();
  }

  public async clickOnResourceJsonFile(lang: LanguageCode): Promise<void> {
    await this.page.getByRole('link', { name: `resource.${lang}.json` }).click();
  }

  public async verifyLanguageFile(lang: LanguageCode): Promise<void> {
    await this.page.getByText(`"language": "${lang}"`, { exact: true }).isVisible();
  }

  public async verifyTextIdAndValue(id: string, value: string): Promise<void> {
    await this.page.getByText(`"id": "${id}", "value": "${value}"`, { exact: true }).isVisible();
  }

  public async clickOnProcessFilesButton(): Promise<void> {
    await this.page.getByRole('link', { name: giteaPageTexts['process'], exact: true }).click();
  }

  public async clickOnProcessBpmnFile(): Promise<void> {
    await this.page.getByRole('link', { name: `${giteaPageTexts['process']}.bpmn` }).click();
  }

  public async verifyThatTheNewTaskIsVisible(id: string, task: BpmnTaskType): Promise<void> {
    const text = this.page.getByText(`<bpmn:task id="${id}" name="Altinn ${task} task">`);
    await expect(text).toBeVisible();
  }

  public async verifyThatTheNewTaskIsHidden(id: string, task: BpmnTaskType): Promise<void> {
    await this.page.getByText(`<bpmn:task id="${id}" name="Altinn ${task} task">`).isHidden();
  }

  public async verifySequenceFlowDirection(fromId: string, toId: string): Promise<void> {
    const firstPartOfText = this.page.getByText('<bpmn:sequenceFlow id="Flow_');
    await expect(firstPartOfText).toBeVisible();

    const secondPartOfText = this.page.getByText(`" sourceRef="${fromId}" targetRef="${toId}" />`);
    await expect(secondPartOfText).toBeVisible();
  }

  public async clickOnApplicationMetadataFile(): Promise<void> {
    await this.page
      .getByRole('link', { name: `${giteaPageTexts['applicationmetadata']}.json` })
      .click();
  }

  public async verifyIdInDataModel(id: string, dataModel: string): Promise<void> {
    const text = `
      "id": "${dataModel}",
      "allowedContentTypes": [
        "application/xml"
      ],
      "appLogic": {
        "autoCreate": true,
        "classRef": "Altinn.App.Models.${dataModel}.${dataModel}",
        "allowAnonymousOnStateless": false,
        "autoDeleteOnProcessEnd": false,
        "allowUserCreate": false,
        "allowUserDelete": false,
        "allowInSubform": false
      },
      "taskId": "${id}",
      "maxCount": 1,
      "minCount": 1,
      "enablePdfCreation": true,
      "enableFileScan": false,
      "validationErrorOnPendingFileScan": false,
      "enabledFileAnalysers": [],
      "enabledFileValidators": []
    `;
    const textLocator = this.page.getByText(text);
    expect(textLocator).toBeVisible();
  }

  public async verifyThatActionIsVisible(action: string): Promise<void> {
    await this.page.getByText(`<altinn:action>${action}</altinn:action>`).isVisible();
  }

  public async verifyThatActionIsCustomServerAction(action: string): Promise<void> {
    await this.page
      .getByText(`<altinn:action type="serverAction">${action}</altinn:action>`)
      .isVisible();
  }

  public async verifyThatActionIsHidden(action: string): Promise<void> {
    await this.page.getByText(`<altinn:action>${action}</altinn:action>`).isHidden();
  }

  public async verifyThatTaskIsVisible(task: string): Promise<void> {
    await this.page.getByText(`<altinn:taskType>${task}</altinn:taskType>`).isVisible();
  }

  public async verifyThatDataTypeToSignIsVisible(dataTypeToSign: string): Promise<void> {
    const text = `
      <altinn:signatureConfig>
        <altinn:dataTypesToSign>
          <altinn:dataType>${dataTypeToSign}</altinn:dataType>
        </altinn:dataTypesToSign>
      </altinn:signatureConfig>
    `;
    await this.page.getByText(text).isVisible();
  }

  public async verifyThatCustomReceiptIsNotVisible(): Promise<void> {
    await this.page.getByText('"taskId": "CustomReceipt"').isHidden();
  }

  public async verifyThatCustomReceiptIsVisible(): Promise<void> {
    await this.page.getByText('"taskId": "CustomReceipt"').isVisible();
  }
}
