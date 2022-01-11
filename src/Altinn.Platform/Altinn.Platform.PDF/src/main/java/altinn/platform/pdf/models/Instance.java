package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;

import javax.validation.constraints.NotNull;
import java.util.List;

@Schema(description = "The instance metadata json file.")
public class Instance {
  @NotNull
  private String id;
  private List<Data> data;
  private String instanceOwnerId;
  private String appId;
  @NotNull
  private String org;
  private String createdDateTime;
  private String lastChangedDateTime;
  private Title title;

  public Title getTitle() {
    return title;
  }

  public void setTitle(Title title) {
    this.title = title;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public List<Data> getData() {
    return data;
  }

  public void setData(List<Data> data) {
    this.data = data;
  }

  public String getInstanceOwnerId() {
    return instanceOwnerId;
  }

  public void setInstanceOwnerId(String instanceOwnerId) {
    this.instanceOwnerId = instanceOwnerId;
  }

  public String getAppId() {
    return appId;
  }

  public void setAppId(String appId) {
    this.appId = appId;
  }

  public String getOrg() {
    return org;
  }

  public void setOrg(String org) {
    this.org = org;
  }

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
}
