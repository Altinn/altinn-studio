import { componentMocks } from '../../../../testing/componentMocks';
import {
  extractFileNameFromImageSrc,
  updateComponentWithDeletedImageReference,
  updateComponentWithImage,
} from './EditImageUtils';
import { ComponentType } from 'app-shared/types/ComponentType';

describe('EditImageUtils', () => {
  describe('updateComponentWithImage', () => {
    it('updates component with new image source', () => {
      const newImageSource = 'newImageSource';
      const updatedComponent = updateComponentWithImage(
        componentMocks[ComponentType.Image],
        newImageSource,
      );
      expect(updatedComponent).toStrictEqual({
        ...componentMocks[ComponentType.Image],
        image: {
          ...componentMocks[ComponentType.Image].image,
          src: {
            nb: newImageSource,
          },
        },
      });
    });
  });

  describe('updateComponentWithDeletedImageReference', () => {
    it('updates component that already has an image source with deleted image source reference', () => {
      const imageComponentWithImageSource = {
        ...componentMocks[ComponentType.Image],
        image: {
          ...componentMocks[ComponentType.Image].image,
          src: {
            nb: 'someImageReference.png',
          },
        },
      };
      const updatedComponent = updateComponentWithDeletedImageReference(
        imageComponentWithImageSource,
      );
      expect(updatedComponent).toStrictEqual({
        ...imageComponentWithImageSource,
        image: {
          ...imageComponentWithImageSource.image,
          src: {},
        },
      });
    });

    it('updates component that does not have an image source with deleted image source reference', () => {
      const updatedComponent = updateComponentWithDeletedImageReference(
        componentMocks[ComponentType.Image],
      );
      expect(updatedComponent).toStrictEqual({
        ...componentMocks[ComponentType.Image],
        image: {
          ...componentMocks[ComponentType.Image].image,
          src: {},
        },
      });
    });
  });

  describe('extractFileNameFromImageSrc', () => {
    it.each([
      ['ttd', 'frontend-test'],
      ['someRandomOrg', 'someRandomApp'],
    ])(
      'extracts file name from relative path when org is %s and app is %s',
      (org: string, app: string) => {
        const fileName = 'image.png';
        const imageSource = `/${org}/${app}/${fileName}`;
        const extractedFileName = extractFileNameFromImageSrc(imageSource, org, app);
        expect(extractedFileName).toBe(fileName);
      },
    );

    it('returns undefined if org or app is not matching', () => {
      const org = 'ttd';
      const app = 'frontend-test';
      const fileName = 'image.png';
      const imageSource = `/someOtherOrg/someOtherApp/${fileName}`;
      const extractedFileName = extractFileNameFromImageSrc(imageSource, org, app);
      expect(extractedFileName).toBe(undefined);
    });

    it('extracts fileName from wwwroot path', () => {
      const fileName = 'image.png';
      const imageSource = `wwwroot/${fileName}`;
      const extractedFileName = extractFileNameFromImageSrc(imageSource, 'ttd', 'frontend-test');
      expect(extractedFileName).toBe(fileName);
    });

    it('returns original string if source is neither relative or wwwroot', () => {
      const imageSource = `http://someExternalUrl/image.png`;
      const extractedFileName = extractFileNameFromImageSrc(imageSource, 'ttd', 'frontend-test');
      expect(extractedFileName).toBe(undefined);
    });
  });
});
