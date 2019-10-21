package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@ApiModel(description = "The PDF context which the PDF is generated from.")
public class PdfContext {

  @ApiModelProperty(notes = "The text resources json file")
  private TextResources textResources;

  @ApiModelProperty(notes = "The form layout json file")
  private FormLayout formLayout;

  @ApiModelProperty(notes = "The xml data file, note: must be base 64 encoded")
  private String data;

  @ApiModelProperty(notes = "The instance metadata json file")
  private Instance instance;

  public TextResources getTextResources() {
    return textResources;
  }

  public void setTextResources(TextResources textResources) { this.textResources = textResources; }

  public FormLayout getFormLayout() { return formLayout; }

  public void setFormLayout(FormLayout formLayout) { this.formLayout = formLayout; }

  public String getData() { return data; }

  public void setData(String data) { this.data = data; }

  public Instance getInstance() { return instance; }

  public void setInstance(Instance instance) { this.instance = instance; }
}
