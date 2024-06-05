import type { Locator, Page } from '@playwright/test';
import { textMock } from '../helpers/textMock';
import { Routes, url } from '../helpers/routes';
import { ResourceEnvironment } from '../helpers/ResourceEnvironment';
import type { Environment } from '../helpers/ResourceEnvironment';

export class ResourceDashboardPage extends ResourceEnvironment {
  private readonly resourceNameField: Locator;
  private readonly createResourceButton: Locator;
  private readonly confirmCreateButton: Locator;

  constructor(
    public readonly page: Page,
    environment?: Environment,
  ) {
    super(environment);
    this.resourceNameField = this.page.getByLabel(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    this.createResourceButton = this.page.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_resource'),
    });
    this.confirmCreateButton = this.page.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
  }

  public async goto(): Promise<void> {
    await this.page.goto(url(Routes.resourceDashboard, { org: this.org, repo: this.repo }));
  }

  public async clickOnCreateNewResourceButton(): Promise<void> {
    await this.createResourceButton.click();
  }

  public async writeResourceName(username: string): Promise<void> {
    await this.resourceNameField.fill(username);
  }

  public async clickOnCreateResourceButton(): Promise<void> {
    await this.confirmCreateButton.click();
  }

  public async verifyResourcePage(resourceId: string): Promise<void> {
    await this.page.waitForURL(
      url(Routes.resourcePage, { org: this.org, repo: this.repo, resourceId: resourceId }),
    );
  }
}
