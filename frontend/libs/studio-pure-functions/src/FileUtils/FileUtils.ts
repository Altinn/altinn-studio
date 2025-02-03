export class FileUtils {
  static convertToFormData = (file: File): FormData => {
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  };
}
