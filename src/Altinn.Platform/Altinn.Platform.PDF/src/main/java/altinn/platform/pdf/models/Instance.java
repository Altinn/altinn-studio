package altinn.platform.pdf.models;
import io.swagger.annotations.ApiModel;

import java.util.List;

@ApiModel(description = "The instance metadata json file.")
public class Instance {
  public String id;
  public List<Data> data;
  public String instanceOwnerId;
  public String appId;
  public String org;
  public String createdDateTime;
  public String lastChangedDateTime;
  public PresentationField presentationField;
}
