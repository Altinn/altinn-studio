package altinn.platform.pdf.models;

public class PDFLayoutElement {
  public String type;
  public String id;
  public DataModelBindings dataModelBindings;
  public TextResourceBindings textResourceBindings;
  public Option[] options;


  public PDFLayoutElement(String type, String id, DataModelBindings dataModelBindings, TextResourceBindings textResourceBindings, Option[] options) {
    this.type = type;
    this.id = id;
    this.dataModelBindings = dataModelBindings;
    this.textResourceBindings = textResourceBindings;
    this.options = options;
  }
}
