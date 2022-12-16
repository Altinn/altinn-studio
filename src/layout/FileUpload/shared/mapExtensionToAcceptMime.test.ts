import { mapExtensionToAcceptMime, mapExtToMimeObject } from 'src/layout/FileUpload/shared/mapExtensionToAcceptMime';

describe('mapExtensionToAcceptMime', () => {
  it('should map a single file extension as string to mime object', () => {
    const result = mapExtensionToAcceptMime({ extensionList: '.png' });
    expect(result).toEqual({
      'image/png': ['.png'],
    });
  });

  it('should map a single file extension as an array to mime object', () => {
    const result = mapExtensionToAcceptMime({ extensionList: ['.png'] });
    expect(result).toEqual({
      'image/png': ['.png'],
    });
  });

  it('should map multiple file extensions as an array to mime object', () => {
    const result = mapExtensionToAcceptMime({
      extensionList: ['.png', '.jpg'],
    });
    expect(result).toEqual({
      'image/png': ['.png'],
      'image/jpeg': ['.jpg'],
    });
  });

  it('should map multiple file extensions as a comma separated list to mime object', () => {
    const result = mapExtensionToAcceptMime({
      extensionList: '.png, .jpg',
    });
    expect(result).toEqual({
      'image/png': ['.png'],
      'image/jpeg': ['.jpg'],
    });
  });
});

describe('mapExtToMimeObject', () => {
  it('should map file extension to mime object', () => {
    const result = mapExtToMimeObject('.png');
    expect(result).toEqual({
      'image/png': ['.png'],
    });
  });
});
