import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { textMock } from '../helpers/textMock';
import type { TextKey } from '../helpers/textMock';
import { url, Routes } from '../helpers/routes';
import { ResourceEnvironment } from '../helpers/ResourceEnvironment';
import type { Environment } from '../helpers/ResourceEnvironment';

export class ResourcePage extends ResourceEnvironment {
  private readonly resourceId: string;
  private readonly resourceTypeRadio: Locator;
  private readonly nameNbTextField: Locator;
  private readonly nameNnTextField: Locator;
  private readonly nameEnTextField: Locator;
  private readonly descriptionNbTextField: Locator;
  private readonly descriptionNnTextField: Locator;
  private readonly descriptionEnTextField: Locator;
  private readonly rightsDecriptionNbTextField: Locator;
  private readonly rightsDecriptionNnTextField: Locator;
  private readonly rightsDecriptionEnTextField: Locator;
  private readonly statusRadio: Locator;
  private readonly availableForTypeCheckbox: Locator;
  private readonly categoryTextField: Locator;
  private readonly policyTab: Locator;
  private readonly ruleHeader: Locator;
  private readonly addPolicyRuleButton: Locator;
  private readonly policyActionDropdown: Locator;
  private readonly policySubjectDropdown: Locator;
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
    this.nameNbTextField = this.page.getByLabel(
      textMock('resourceadm.about_resource_resource_title_label'),
    );
    this.nameNnTextField = this.page.getByLabel(
      this.getTranslatedTitle('resourceadm.about_resource_translation_title', 'language.nn'),
    );
    this.nameEnTextField = this.page.getByLabel(
      this.getTranslatedTitle('resourceadm.about_resource_translation_title', 'language.en'),
    );
    this.descriptionNbTextField = this.page.getByLabel(
      textMock('resourceadm.about_resource_resource_description_label'),
    );
    this.descriptionNnTextField = this.page.getByLabel(
      this.getTranslatedTitle('resourceadm.about_resource_translation_description', 'language.nn'),
    );
    this.descriptionEnTextField = this.page.getByLabel(
      this.getTranslatedTitle('resourceadm.about_resource_translation_description', 'language.en'),
    );
    this.rightsDecriptionNbTextField = this.page.getByLabel(
      textMock('resourceadm.about_resource_rights_description_label'),
    );
    this.rightsDecriptionNnTextField = this.page.getByLabel(
      this.getTranslatedTitle(
        'resourceadm.about_resource_translation_right_description',
        'language.nn',
      ),
    );
    this.rightsDecriptionEnTextField = this.page.getByLabel(
      this.getTranslatedTitle(
        'resourceadm.about_resource_translation_right_description',
        'language.en',
      ),
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
    this.policySubjectDropdown = this.page.getByLabel(
      textMock('policy_editor.rule_card_subjects_title'),
    );
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

  private getTranslatedTitle = (title: TextKey, lang: TextKey): string => {
    return `${textMock(title)} (${textMock(lang)})`;
  };

  public async goto(): Promise<void> {
    await this.page.goto(
      url(Routes.resourcePage, { org: this.org, repo: this.repo, resourceId: this.resourceId }),
    );
  }

  public async setResourceType(): Promise<void> {
    await this.resourceTypeRadio.click();
  }

  public async writeNameNbTextField(value: string): Promise<void> {
    await this.nameNbTextField.fill(value);
  }

  public async writeNameNnTextField(value: string): Promise<void> {
    await this.nameNnTextField.fill(value);
  }

  public async writeNameEnTextField(value: string): Promise<void> {
    await this.nameEnTextField.fill(value);
  }

  public async writeDescriptionNbTextField(value: string): Promise<void> {
    await this.descriptionNbTextField.fill(value);
  }

  public async writeDescriptionNnTextField(value: string): Promise<void> {
    await this.descriptionNnTextField.fill(value);
  }

  public async writeDescriptionEnTextField(value: string): Promise<void> {
    await this.descriptionEnTextField.fill(value);
  }

  public async writeRightsDescriptionNbTextField(value: string): Promise<void> {
    await this.rightsDecriptionNbTextField.fill(value);
  }

  public async writeRightsDescriptionNnTextField(value: string): Promise<void> {
    await this.rightsDecriptionNnTextField.fill(value);
  }

  public async writeRightsDescriptionEnTextField(value: string): Promise<void> {
    await this.rightsDecriptionEnTextField.fill(value);
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
      await this.setPolicySubject();
    }
  }

  private async setPolicyAction(): Promise<void> {
    await this.policyActionDropdown.click();
    await this.policyActionDropdown.press('ArrowDown');
    await this.policyActionDropdown.press('Enter');
  }

  private async setPolicySubject(): Promise<void> {
    await this.policySubjectDropdown.click();
    await this.policySubjectDropdown.press('ArrowDown');
    await this.policySubjectDropdown.press('Enter');
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
