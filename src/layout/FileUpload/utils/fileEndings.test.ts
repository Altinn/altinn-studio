import { getFileEnding, removeFileEnding } from 'src/layout/FileUpload/utils/fileEndings';

describe('attachment file ending utils', () => {
  describe('getFileEnding', () => {
    it('should get file ending correctly', () => {
      expect(getFileEnding('test.jpg')).toEqual('.jpg');
      expect(getFileEnding('navn.med.punktum.xml')).toEqual('.xml');
      expect(getFileEnding('navnutenfilendelse')).toEqual('');
      expect(getFileEnding(undefined)).toEqual('');
    });
    it('should normalize file endings to lower case', () => {
      expect(getFileEnding('test.JPG')).toEqual('.jpg');
    });
  });

  describe('removeFileEnding', () => {
    it('should remove file ending correctly', () => {
      expect(removeFileEnding('test.jpg')).toEqual('test');
      expect(removeFileEnding('navn.med.punktum.xml')).toEqual('navn.med.punktum');
      expect(removeFileEnding('navnutenfilendelse')).toEqual('navnutenfilendelse');
      expect(removeFileEnding(undefined)).toEqual('');
    });
  });
});
