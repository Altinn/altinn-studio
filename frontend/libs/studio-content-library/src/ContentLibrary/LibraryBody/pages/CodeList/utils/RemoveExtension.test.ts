import { RemoveExtension } from './RemoveExtension';

describe('RemoveExtension', () => {
  it('removes the extension for a file with a single dot', () => {
    expect(RemoveExtension('file.txt')).toBe('file');
  });

  it('removes the last extension for a file with multiple dots', () => {
    expect(RemoveExtension('archive.tar.gz')).toBe('archive.tar');
  });

  it('returns the same string if there is no dot in the filename', () => {
    expect(RemoveExtension('filename')).toBe('filename');
  });

  it('removes the extension for a hidden file with an extension', () => {
    expect(RemoveExtension('.hiddenfile.txt')).toBe('.hiddenfile');
  });

  it('returns an empty string if the filename starts with a dot but has no extension', () => {
    expect(RemoveExtension('.hiddenfile')).toBe('');
  });

  it('returns an empty string if the filename is just a dot', () => {
    expect(RemoveExtension('.')).toBe('');
  });

  it('returns the same string if the filename is empty', () => {
    expect(RemoveExtension('')).toBe('');
  });

  it('removes the extension for filenames with special characters', () => {
    expect(RemoveExtension('my-file.name$!.txt')).toBe('my-file.name$!');
  });

  it('removes the extension for filenames with spaces', () => {
    expect(RemoveExtension('file name.txt')).toBe('file name');
  });

  it('removes the extension for filenames with numbers', () => {
    expect(RemoveExtension('file123.456.txt')).toBe('file123.456');
  });
});
