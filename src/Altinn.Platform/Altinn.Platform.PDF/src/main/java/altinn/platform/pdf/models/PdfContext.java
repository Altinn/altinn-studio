package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@ApiModel(description = "The PDF context which the PDF is generated from.")
public class PdfContext {

  @ApiModelProperty(notes = "The text resources json file")
  public TextResources textResources;

  @ApiModelProperty(notes = "The form layout json file")
  public FormLayout formLayout;

  @ApiModelProperty(notes = "The xml data file, note: must be base 64 encoded")
  public String data;

  @ApiModelProperty(notes = "The instance metadata json file")
  public Instance instance;
}
