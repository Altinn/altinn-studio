import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { textMock } from '../helpers/textMock';
import { url, Routes } from '../helpers/routes';
import { ResourceEnvironment } from '../helpers/ResourceEnvironment';
import type { Environment } from '../helpers/ResourceEnvironment';

export class ResourcePage extends ResourceEnvironment {
  private readonly resourceId: string;
  private readonly resourceTypeRadio: Locator;
  private readonly titleTextField: Locator;
  private readonly titleNbTab: Locator;
  private readonly titleNnTab: Locator;
  private readonly titleEnTab: Locator;
  private readonly descriptionTextField: Locator;
  private readonly descriptionNbTab: Locator;
  private readonly descriptionNnTab: Locator;
  private readonly descriptionEnTab: Locator;
  private readonly rightsDescriptionTextField: Locator;
  private readonly rightsDescriptionNbTab: Locator;
  private readonly rightsDescriptionNnTab: Locator;
  private readonly rightsDescriptionEnTab: Locator;
  private readonly statusRadio: Locator;
  private readonly availableForTypeCheckbox: Locator;
  private readonly categoryTextField: Locator;
  private readonly policyTab: Locator;
  private readonly ruleHeader: Locator;
  private readonly addPolicyRuleButton: Locator;
  private readonly policyActionDropdown: Locator;
  private readonly policySubjectAccordion: Locator;
  private readonly policySubjectCheckbox: Locator;
  private readonly publishTab: Locator;
  private readonly versionTextField: Locator;
  private readonly uploadChangesButton: Locator;
  private readonly validateChangesButton: Locator;
  private readonly repoSyncAlert: Locator;
  private readonly publishAlert: Locator;

  constructor(
    public readonly page: Page,
    resourceId: string,
    environment?: Environment,
  ) {
    super(environment);
    this.resourceId = resourceId;
    this.resourceTypeRadio = this.page.getByRole('radio', {
      name: textMock('resourceadm.about_resource_resource_type_generic_access_resource'),
    });
    this.titleTextField = this.page.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_title_label'),
    });
    this.titleNbTab = this.page.getByLabel(
      `${textMock('language.nb')} ${textMock('resourceadm.about_resource_resource_title_label')}`,
    );
    this.titleNnTab = this.page.getByLabel(
      `${textMock('language.nn')} ${textMock('resourceadm.about_resource_resource_title_label')}`,
    );
    this.titleEnTab = this.page.getByLabel(
      `${textMock('language.en')} ${textMock('resourceadm.about_resource_resource_title_label')}`,
    );

    this.descriptionTextField = this.page.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_description_label'),
    });
    this.descriptionNbTab = this.page.getByLabel(
      `${textMock('language.nb')} ${textMock('resourceadm.about_resource_resource_description_label')}`,
    );
    this.descriptionNnTab = this.page.getByLabel(
      `${textMock('language.nn')} ${textMock('resourceadm.about_resource_resource_description_label')}`,
    );
    this.descriptionEnTab = this.page.getByLabel(
      `${textMock('language.en')} ${textMock('resourceadm.about_resource_resource_description_label')}`,
    );

    this.rightsDescriptionTextField = this.page.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_rights_description_label'),
    });
    this.rightsDescriptionNbTab = this.page.getByLabel(
      `${textMock('language.nb')} ${textMock('resourceadm.about_resource_rights_description_label')}`,
    );
    this.rightsDescriptionNnTab = this.page.getByLabel(
      `${textMock('language.nn')} ${textMock('resourceadm.about_resource_rights_description_label')}`,
    );
    this.rightsDescriptionEnTab = this.page.getByLabel(
      `${textMock('language.en')} ${textMock('resourceadm.about_resource_rights_description_label')}`,
    );

    this.statusRadio = this.page.getByRole('radio', {
      name: textMock('resourceadm.about_resource_status_under_development'),
    });
    this.availableForTypeCheckbox = this.page.getByRole('checkbox', {
      name: textMock('resourceadm.about_resource_available_for_type_private'),
    });
    this.ruleHeader = this.page.getByLabel(textMock('policy_editor.rule'));
    this.categoryTextField = this.page.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_contact_label_category'),
    });
    this.policyTab = this.page.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_policy'),
    });
    this.addPolicyRuleButton = this.page.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });
    this.policyActionDropdown = this.page.getByLabel(
      textMock('policy_editor.rule_card_actions_title'),
    );
    this.policySubjectAccordion = this.page.getByRole('button', {
      name: textMock('policy_editor.org_subjects_header'),
    });
    this.policySubjectCheckbox = this.page.getByRole('checkbox').first();
    this.publishTab = this.page.getByRole('tab', {
      name: textMock('resourceadm.left_nav_bar_deploy'),
    });
    this.versionTextField = this.page.getByLabel(textMock('resourceadm.deploy_version_label'));
    this.uploadChangesButton = this.page.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    this.validateChangesButton = this.page.getByRole('button', {
      name: textMock('sync_header.describe_and_validate_btnText'),
    });
    this.repoSyncAlert = this.page.getByText(textMock('resourceadm.deploy_status_card_error_repo'));
    this.publishAlert = this.page.getByText(textMock('resourceadm.deploy_status_card_success'));
  }

  public async goto(): Promise<void> {
    await this.page.goto(
      url(Routes.resourcePage, { org: this.org, repo: this.repo, resourceId: this.resourceId }),
    );
  }

  public async setResourceType(): Promise<void> {
    await this.resourceTypeRadio.click();
  }

  public async writeNameNbTextField(value: string): Promise<void> {
    await this.titleNbTab.click();
    await this.titleTextField.fill(value);
  }

  public async writeNameNnTextField(value: string): Promise<void> {
    await this.titleNnTab.click();
    await this.titleTextField.fill(value);
  }

  public async writeNameEnTextField(value: string): Promise<void> {
    await this.titleEnTab.click();
    await this.titleTextField.fill(value);
  }

  public async writeDescriptionNbTextField(value: string): Promise<void> {
    await this.descriptionNbTab.click();
    await this.descriptionTextField.fill(value);
  }

  public async writeDescriptionNnTextField(value: string): Promise<void> {
    await this.descriptionNnTab.click();
    await this.descriptionTextField.fill(value);
  }

  public async writeDescriptionEnTextField(value: string): Promise<void> {
    await this.descriptionEnTab.click();
    await this.descriptionTextField.fill(value);
  }

  public async writeRightsDescriptionNbTextField(value: string): Promise<void> {
    await this.rightsDescriptionNbTab.click();
    await this.rightsDescriptionTextField.fill(value);
  }

  public async writeRightsDescriptionNnTextField(value: string): Promise<void> {
    await this.rightsDescriptionNnTab.click();
    await this.rightsDescriptionTextField.fill(value);
  }

  public async writeRightsDescriptionEnTextField(value: string): Promise<void> {
    await this.rightsDescriptionEnTab.click();
    await this.rightsDescriptionTextField.fill(value);
  }

  public async setStatus(): Promise<void> {
    await this.statusRadio.click();
  }

  public async setAvailableForType(): Promise<void> {
    const isAvailableForChecked = await this.availableForTypeCheckbox.isChecked();
    if (!isAvailableForChecked) {
      await this.availableForTypeCheckbox.click();
    }
  }

  public async writeCategoryTextField(value: string): Promise<void> {
    await this.categoryTextField.fill(value);
  }

  public async gotoPolicyTab(): Promise<void> {
    await this.policyTab.click();
  }

  public async addPolicyRule(): Promise<void> {
    await expect(this.addPolicyRuleButton).toBeVisible({ timeout: 15000 }); // wait for policy page to be displayed
    const isPolicyRuleVisible = await this.ruleHeader.isVisible();
    if (!isPolicyRuleVisible) {
      await this.addPolicyRuleButton.click();
      await this.setPolicyAction();
      await this.expandPolicySubjectAccordion();
      await this.setPolicySubject();
    }
  }

  private async setPolicyAction(): Promise<void> {
    await this.policyActionDropdown.click();
    await this.policyActionDropdown.press('ArrowDown');
    await this.policyActionDropdown.press('Enter');
  }

  private async expandPolicySubjectAccordion(): Promise<void> {
    await this.policySubjectAccordion.click();
  }

  private async setPolicySubject(): Promise<void> {
    await this.policySubjectCheckbox.click();
  }

  public async gotoPublishTab(): Promise<void> {
    await this.publishTab.click();
  }

  public async writeVersionTextField(value: string): Promise<void> {
    await this.versionTextField.fill(value);
    await this.versionTextField.blur();
  }

  public async verifyRepoNotInSyncVisible(): Promise<void> {
    await expect(this.repoSyncAlert).toBeVisible({ timeout: 15000 });
  }

  public async clickUploadChangesButton(): Promise<void> {
    await this.uploadChangesButton.click();
  }

  public async clickValidateChangesButtonButton(): Promise<void> {
    await this.validateChangesButton.click();
  }

  public async verifyDeployAlertVisible(): Promise<void> {
    await expect(this.publishAlert).toBeVisible({ timeout: 15000 });
  }
}
