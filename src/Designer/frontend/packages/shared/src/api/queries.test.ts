import { getAppMetadata, getAppPolicy } from './queries';
import { getWithRevision } from 'app-shared/utils/networking';
import { appMetadataPath, appPolicyPath } from './paths';
import type { Policy } from '../types/Policy';
import type { ApplicationMetadata } from '../types/ApplicationMetadata';
import { app, org } from '@studio/testing/testids';

jest.mock('app-shared/utils/networking');

describe('getAppPolicy', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads the application policy through the revision adapter', async () => {
    const policy: Policy = {
      revision: '"loaded-revision"',
      rules: [],
      requiredAuthenticationLevelEndUser: '3',
      requiredAuthenticationLevelOrg: '3',
    };
    jest.mocked(getWithRevision).mockResolvedValueOnce(policy);

    const result = await getAppPolicy(org, app);

    expect(getWithRevision).toHaveBeenCalledWith(appPolicyPath(org, app));
    expect(result).toEqual(policy);
  });
});

describe('getAppMetadata', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads application metadata through the revision adapter', async () => {
    const metadata: ApplicationMetadata = { id: `${org}/${app}`, org, revision: '"loaded-revision"' };
    jest.mocked(getWithRevision).mockResolvedValueOnce(metadata);

    const result = await getAppMetadata(org, app);

    expect(getWithRevision).toHaveBeenCalledWith(appMetadataPath(org, app));
    expect(result).toEqual(metadata);
  });
});
