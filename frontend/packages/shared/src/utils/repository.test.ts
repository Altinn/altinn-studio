import { org } from '@studio/testing/testids';
import { RepositoryType } from '../types/global';
import { getRepositoryType } from './repository';

describe('getRepositoryType', () => {
  it('should return "App" when repository name is not "<org>-datamodels"', () => {
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
});
