import { RepositoryType } from 'app-development/types/global';
import { getRepositoryType } from './repository';

describe('getRepositoryType', () => {
  const testOrg = 'test-org';
  it('should return "App" when repository name is not "<org>-datamodels"', () => {

    expect(getRepositoryType(testOrg, 'some-app-name')).toBe(RepositoryType.App);
  });

  it('should return "App" when repository name ends with "datamodels" but does not match "<org>-datamodels" exactly', () => {
    expect(getRepositoryType(testOrg, 'something-datamodels')).toBe(RepositoryType.App);
  });

  it('should return "App" when repository name contains "<org>-datamodels", but does not match exactly', () => {
    expect(getRepositoryType(testOrg, `test-${testOrg}-datamodels`)).toBe(RepositoryType.App);
  });

  it('should return "Datamodels" when repository name matches "<org>-datamodels" exactly', () => {
    expect(getRepositoryType(testOrg, `${testOrg}-datamodels`)).toBe(RepositoryType.Datamodels);
  });
})
