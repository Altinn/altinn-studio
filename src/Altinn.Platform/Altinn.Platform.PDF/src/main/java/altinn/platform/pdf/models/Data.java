package altinn.platform.pdf.models;

public class Data {
  private String id;
  private String elementType;
  private String contentType;
  private String storageUrl;
  private Integer fileSize;
  private Boolean isLocked;
  private String createdDateTime;
  private String lastChangedDateTime;
  private String fileName;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getElementType() {
    return elementType;
  }

  public void setElementType(String elementType) {
    this.elementType = elementType;
  }

  public String getContentType() {
    return contentType;
  }

  public void setContentType(String contentType) {
    this.contentType = contentType;
  }

  public String getStorageUrl() { return storageUrl; }

  public void setStorageUrl(String storageUrl) {
    this.storageUrl = storageUrl;
  }

  public Integer getFileSize() {
    return fileSize;
  }

  public void setFileSize(Integer fileSize) {
    this.fileSize = fileSize;
  }

  public Boolean getLocked() {
    return isLocked;
  }

  public void setLocked(Boolean locked) { isLocked = locked; }

  public String getCreatedDateTime() {
    return createdDateTime;
  }

  public void setCreatedDateTime(String createdDateTime) {
    this.createdDateTime = createdDateTime;
  }

  public String getLastChangedDateTime() {
    return lastChangedDateTime;
  }

  public void setLastChangedDateTime(String lastChangedDateTime) {
    this.lastChangedDateTime = lastChangedDateTime;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }
}
