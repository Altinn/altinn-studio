import { returnUrlToMessagebox, sharedUrls } from './urlHelper';
import {
  APP_DEVELOPMENT_BASENAME,
  DASHBOARD_BASENAME,
} from 'app-shared/constants';

describe('Shared urlHelper.ts', () => {
  describe('sharedUrls ', () => {
    const oldWindowLocation = window.location;

    afterAll(() => {
      window.location = oldWindowLocation;
    });

    const runUrlTests = () => {
      expect(sharedUrls().dataModelsApi).toBe(
        'https://altinn3.no/designer/api/org/repo/datamodels',
      );
      expect(sharedUrls().dataModelUploadPageUrl).toContain(
        `${APP_DEVELOPMENT_BASENAME}/org/repo/datamodel`,
      );
      expect(sharedUrls().dataModelXsdUrl).toContain(
        '/designer/org/repo/Model/GetXsd',
      );
      expect(sharedUrls().repositoryGitUrl).toContain('/repos/org/repo.git');
      expect(sharedUrls().repositoryUrl).toContain('/repos/org/repo');
    };

    test('sharedUrls generates expected urls on an app-development location', () => {
      delete window.location;

      window.location = {
        ...oldWindowLocation,
        origin: 'https://altinn3.no',
        pathname: `${APP_DEVELOPMENT_BASENAME}/org/repo`,
      };
      runUrlTests();
    });

    test.skip('sharedUrls generates expected urls on a the dashboard location', () => {
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://altinn3.no',
        pathname: `${DASHBOARD_BASENAME}/datamodelling/org/repo`,
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
      const origin = 'https://altinn3.no/tdd/tjeneste-20190826-1130';
      expect(returnUrlToMessagebox(origin)).toContain('altinn3.no');
    });

    test('returnUrlToMessagebox() returning null when unknown origin', () => {
      const origin = 'https://www.vg.no';
      expect(returnUrlToMessagebox(origin)).toBe(null);
    });
  });
});
