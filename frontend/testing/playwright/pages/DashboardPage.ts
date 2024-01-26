﻿import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

export class DashboardPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadDashboardPage(): Promise<void> {
    await this.page.goto(this.getRoute('dashboard'));
  }

  public async verifyDashboardPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('dashboard'));
  }

  public async clickOnCreateAppLink(): Promise<void> {
    await this.page.getByRole('link', { name: this.textMock('dashboard.new_service') }).click();
  }

  public async checkThatThereIsNoFavouriteAppInList(appName: string): Promise<void> {
    // The .first() is added becuase the key is used two places; one in favourite list, and one in all applications list
    await this.page
      .getByRole('menuitem', { name: this.textMock('dashboard.unstar', { appName }), exact: true })
      .first()
      .isHidden();
  }

  public async clickOnFavouriteApplication(appName: string): Promise<void> {
    await this.page
      .getByRole('menuitem', { name: this.textMock('dashboard.star', { appName }), exact: true })
      .click();
  }

  public async checkThatThereIsFavouriteAppInList(appName: string): Promise<void> {
    await this.page
      .getByRole('menuitem', { name: this.textMock('dashboard.star', { appName }), exact: true })
      .isVisible();
  }

  public async clickOnUnFavouriteApplicatin(appName: string): Promise<void> {
    // The .first() is added becuase the key is used two places; one in favourite list, and one in all applications list
    await this.page
      .getByRole('menuitem', { name: this.textMock('dashboard.unstar', { appName }), exact: true })
      .first()
      .click();
  }

  public async clickOnHeaderAvatar(): Promise<void> {
    await this.page.getByAltText(this.textMock('shared.header_button_alt')).click();
  }

  public async clickOnAllApplications(): Promise<void> {
    await this.page
      .getByRole('menuitem', { name: this.textMock('shared.header_all'), exact: true })
      .click();
  }

  public async checkThatAllApplicationsHeaderIsVisible(): Promise<void> {
    await this.page
      .getByRole('heading', { name: this.textMock('dashboard.all_apps'), level: 2 })
      .isVisible();
  }

  public async clickOnOrgApplications(): Promise<void> {
    await this.page.getByRole('menuitem', { name: 'Testdepartementet' }).click();
  }

  public async checkThatTTDApplicationsHeaderIsVisible(): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock('dashboard.org_apps', { orgName: 'Testdepartementet' }),
      })
      .click();
  }

  public async checkThatAllOrgApplicationsHeaderIsVisible(): Promise<void> {
    await this.page
      .getByRole('heading', {
        name: this.textMock('dashboard.org_apps', { orgName: this.org }),
        level: 2,
      })
      .isVisible();
  }

  public async checkThatAppIsVisible(appName: string): Promise<void> {
    await this.page.getByTitle(appName, { exact: true }).isVisible();
  }

  public async checkThatAppIsHidden(appName: string): Promise<void> {
    await this.page.getByTitle(appName, { exact: true }).isHidden();
  }

  public async typeInSearchField(word: string): Promise<void> {
    await this.page.getByLabel(this.textMock('dashboard.search')).fill(word);
  }

  public async clickOnTestAppGiteaButton(appName: string): Promise<void> {
    await this.page
      .getByRole('menuitem', {
        name: this.textMock('dashboard.repository_in_list', { appName }),
        exact: true,
      })
      .click();
  }

  public async verifyGiteaPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('gitea'));
  }

  public async clickOnTestAppEditButton(appName: string): Promise<void> {
    await this.page
      .getByRole('menuitem', {
        name: this.textMock('dashboard.edit_app', { appName }),
        exact: true,
      })
      .click();
  }
}
