package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;

import javax.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
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
  private String created;
  private String lastChanged;
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

  public String getCreated() {
    return created;
  }

  public void setCreated(String createdDateTime) {
    this.created = createdDateTime;
  }

  public String getLastChanged() {
    return lastChanged;
  }
  public ZonedDateTime getLastChangedZonedDateTime() {
    try{
      return ZonedDateTime.parse(lastChanged, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }catch (DateTimeParseException e){
      System.out.println(e);
      return null;
    }
  }

  public void setLastChanged(String lastChangedDateTime) {
    this.lastChanged = lastChangedDateTime;
  }
}
