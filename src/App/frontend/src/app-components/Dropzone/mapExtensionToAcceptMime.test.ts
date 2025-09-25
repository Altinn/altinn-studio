import { mapExtensionToAcceptMime } from 'src/app-components/Dropzone/mapExtensionToAcceptMime';

describe('mapExtensionToAcceptMime', () => {
  it('should map a single file extension as string to mime object', () => {
    expect(mapExtensionToAcceptMime('.png')).toEqual({
      'image/png': ['.png'],
    });
  });

  it('should map multiple file extensions as an array to mime object', () => {
    expect(mapExtensionToAcceptMime(['.png', '.jpg'])).toEqual({
      'image/png': ['.png'],
      'image/jpeg': ['.jpg'],
    });
  });

  it('should map multiple file extensions as a comma separated list to mime object', () => {
    expect(mapExtensionToAcceptMime('.png, .jpg')).toEqual({
      'image/png': ['.png'],
      'image/jpeg': ['.jpg'],
    });
  });

  it('should map unknown file extensions to application/octet-stream, and ignore the dot', () => {
    expect(mapExtensionToAcceptMime(['.unknown1', 'unknown2'])).toEqual({
      'application/octet-stream': ['.unknown1', '.unknown2'],
    });
  });

  it('should properly extend .csv mime types', () => {
    expect(mapExtensionToAcceptMime('.csv')).toEqual({
      'application/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/csv': ['.csv'],
    });
  });
});
