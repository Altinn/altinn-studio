import { FileUtils } from './FileUtils';

describe('FileUtils', () => {
  describe('convertToFormData', () => {
    it('should append the file to FormData under the key "file"', () => {
      const fileContent = 'Test file contents';
      const fileName = 'test.txt';
      const fileType = 'text/plain';
      const file = new File([fileContent], fileName, { type: fileType });

      const formData = FileUtils.convertToFormData(file);

      const retrievedFile = formData.get('file');
      expect(retrievedFile).toBe(file);
    });
  });
});
