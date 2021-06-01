package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;

@ApiModel(description = "An option")
public class Option {
  private String label;
  private String value;

  public void setLabel(String label) {
    this.label = label;
  }

  public String getLabel() {
    return this.label;
  }

  public void setValue(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}
