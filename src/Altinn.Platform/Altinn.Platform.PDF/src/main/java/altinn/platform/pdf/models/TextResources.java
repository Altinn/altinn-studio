package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "The text resources json file.")
public class TextResources {
  private List<TextResourceElement> resources;
  private String language;

  public List<TextResourceElement> getResources() { return resources; }

  public void setResources(List<TextResourceElement> resources) { this.resources = resources; }

  public String getLanguage() { return language; }

  public void setLanguage(String language) { this.language = language; }
}
