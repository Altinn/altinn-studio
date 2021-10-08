import 'jest';
import { returnUrlToMessagebox, sharedUrls } from '../../../utils/urlHelper';

describe('Shared urlHelper.ts', () => {
  describe('sharedUrls ', () => {
    const oldWindowLocation = window.location;
    afterAll(() => {
      window.location = oldWindowLocation;
    });
    // const localContext =
    const runUrlTests = () => {
      expect(sharedUrls().dataModelsApi).toBe('https://local.altinn.studio/designer/api/org/repo/datamodels');
      expect(sharedUrls().dataModelUploadPageUrl).toContain('/designer/org/repo#/datamodel');
      expect(sharedUrls().dataModelXsdUrl).toContain('/designer/org/repo/Model/GetXsd');
      expect(sharedUrls().repositoryGitUrl).toContain('/repos/org/repo.git');
      expect(sharedUrls().repositoryUrl).toContain('/repos/org/repo');
    };
    test('sharedUrls generates expected urls on an app-development location', () => {
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://local.altinn.studio',
        hash: '#/datamodelling',
        pathname: '/designer/org/repo',
      };
      runUrlTests();
    });
    test('sharedUrls generates expected urls on a the dashboard location', () => {
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://local.altinn.studio',
        hash: '#/datamodelling/org/repo',
        pathname: '/Home/Index',
      };
      runUrlTests();
    });
  });
  describe('returnUrlToMessagebox', () => {
    test('returnUrlToMessagebox() returning production messagebox', () => {
      const origin = 'https://tdd.apps.altinn.no/tdd/myappname';
      expect(returnUrlToMessagebox(origin)).toContain('altinn.no');
    });

    test('returnUrlToMessagebox() returning at21 messagebox', () => {
      const origin = 'https://tdd.apps.at21.altinn.cloud/tdd/myappname';
      expect(returnUrlToMessagebox(origin)).toContain('at21.altinn.cloud');
    });

    test('returnUrlToMessagebox() returning studio messagebox', () => {
      const origin = 'http://local.altinn.studio/tdd/tjeneste-20190826-1130';
      expect(returnUrlToMessagebox(origin)).toContain('local.altinn.studio');
    });

    test('returnUrlToMessagebox() returning null when unknown origin', () => {
      const origin = 'http://www.vg.no';
      expect(returnUrlToMessagebox(origin)).toBe(null);
    });
  });
});
