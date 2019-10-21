package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;

import java.util.List;

@ApiModel(description = "The text resources json file.")
public class TextResources {
  public List<TextResourceElement> resources;
  public String language;
}
