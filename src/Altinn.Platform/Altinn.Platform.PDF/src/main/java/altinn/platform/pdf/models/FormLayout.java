package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The form layout json file.")
public class FormLayout {
  private FormLayoutData data;

  public FormLayoutData getData() {
    return data;
  }

  public void setData(FormLayoutData data) {
    this.data = data;
  }
}
