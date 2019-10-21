package altinn.platform.pdf.models;

public class FormLayoutElement {
  private String type;
  private String id;
  private DataModelBindings dataModelBindings;
  private TextResourceBindings textResourceBindings;

  public String getType() {
    return type;
  }

  public void setType(String type) { this.type = type; }

  public String getId() { return id; }

  public void setId(String id) { this.id = id; }

  public DataModelBindings getDataModelBindings() { return dataModelBindings; }

  public void setDataModelBindings(DataModelBindings dataModelBindings) { this.dataModelBindings = dataModelBindings; }

  public TextResourceBindings getTextResourceBindings() { return textResourceBindings; }

  public void setTextResourceBindings(TextResourceBindings textResourceBindings) { this.textResourceBindings = textResourceBindings; }
}
