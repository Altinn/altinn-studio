import { describe, expect, it } from 'vitest';
import { org } from '@studio/testing/testids';
import {
  APP_DEVELOPMENT_BASENAME,
  DASHBOARD_BASENAME,
  ORG_LIBRARY_BASENAME,
  RESOURCEADM_BASENAME,
} from 'app-shared/constants';
import { RepositoryType } from '../types/global';
import { getRepositoryEditUrl, getRepositoryType } from './repository';

describe('getRepositoryType', () => {
  it('should return "App" when repository name is not one of the organization repositories', () => {
    expect(getRepositoryType(org, 'some-app-name')).toBe(RepositoryType.App);
  });

  it('should return "App" when repository name ends with "datamodels" but does not match "<org>-datamodels" exactly', () => {
    expect(getRepositoryType(org, 'something-datamodels')).toBe(RepositoryType.App);
  });

  it('should return "App" when repository name contains "<org>-datamodels", but does not match exactly', () => {
    expect(getRepositoryType(org, `test-${org}-datamodels`)).toBe(RepositoryType.App);
  });

  it('should return "DataModels" when repository name matches "<org>-datamodels" exactly', () => {
    expect(getRepositoryType(org, `${org}-datamodels`)).toBe(RepositoryType.DataModels);
  });

  it('should return "Resources" when repository name matches "<org>-resources" exactly', () => {
    expect(getRepositoryType(org, `${org}-resources`)).toBe(RepositoryType.Resources);
  });

  it('should return "App" when repository name ends with "-resources" but does not match "<org>-resources" exactly', () => {
    expect(getRepositoryType(org, 'other-org-resources')).toBe(RepositoryType.App);
  });

  it('should return "OrgLibrary" when repository name matches "<org>-content" exactly', () => {
    expect(getRepositoryType(org, `${org}-content`)).toBe(RepositoryType.OrgLibrary);
  });

  it('should return "App" when repository name ends with "-content" but does not match "<org>-content" exactly', () => {
    expect(getRepositoryType(org, 'other-org-content')).toBe(RepositoryType.App);
  });
});

describe('getRepositoryEditUrl', () => {
  it('should return the app development url for an app', () => {
    expect(getRepositoryEditUrl(org, 'some-app-name')).toBe(
      `${APP_DEVELOPMENT_BASENAME}/${org}/some-app-name`,
    );
  });

  it('should return the data model page url for the data models repository', () => {
    expect(getRepositoryEditUrl(org, `${org}-datamodels`)).toBe(
      `${APP_DEVELOPMENT_BASENAME}/${org}/${org}-datamodels/data-model`,
    );
  });

  it('should return the resource dashboard url for the resources repository', () => {
    expect(getRepositoryEditUrl(org, `${org}-resources`)).toBe(
      `${RESOURCEADM_BASENAME}/${org}/${org}-resources`,
    );
  });

  it('should return the organization library url for the content repository', () => {
    expect(getRepositoryEditUrl(org, `${org}-content`)).toBe(
      `${DASHBOARD_BASENAME}/${ORG_LIBRARY_BASENAME}/${org}`,
    );
  });
});
