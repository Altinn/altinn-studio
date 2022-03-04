package altinn.platform.pdf.models;

import java.util.List;

public class Data {
  private String id;
  private String dataType;
  private String contentType;
  private String blobStoragePath;
  private long size;
  private Boolean isLocked;
  private String created;
  private String lastChanged;
  private String filename;
  private List<String> tags;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getDataType() {
    return dataType;
  }

  public void setDataType(String dataType) {
    this.dataType = dataType;
  }

  public String getContentType() {
    return contentType;
  }

  public void setContentType(String contentType) {
    this.contentType = contentType;
  }

  public String getBlobStoragePath() { return blobStoragePath; }

  public void setBlobStoragePath(String blobStoragePath) {
    this.blobStoragePath = blobStoragePath;
  }

  public long getSize() {
    return size;
  }

  public void setSize(long size) {
    this.size = size;
  }

  public Boolean getLocked() {
    return isLocked;
  }

  public void setLocked(Boolean locked) { isLocked = locked; }

  public String getCreated() {
    return created;
  }

  public void setCreated(String created) {
    this.created = created;
  }

  public String getLastChanged() {
    return lastChanged;
  }

  public void setLastChanged(String lastChanged) {
    this.lastChanged = lastChanged;
  }

  public String getFilename() {
    return filename;
  }

  public void setFilename(String filename) {
    this.filename = filename;
  }

  public List<String> getTags() {
    return tags;
  }

  public void setTags(List<String> tags) {
    this.tags = tags;
  }
}
