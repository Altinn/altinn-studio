package altinn.platform.pdf.models;

import java.util.HashMap;

public class FormLayoutElement {
  private String type;
  private String id;
  private HashMap<String, String> dataModelBindings;
  private TextResourceBindings textResourceBindings;
  private boolean simplified;

  public String getType() {
    return type;
  }

  public void setType(String type) { this.type = type; }

  public boolean isSimplified() { return simplified; }

  public void setSimplified(boolean simplified) { this.simplified = simplified; }

  public String getId() { return id; }

  public void setId(String id) { this.id = id; }

  public HashMap<String, String> getDataModelBindings() { return dataModelBindings; }

  public void setDataModelBindings(HashMap<String, String> dataModelBindings) { this.dataModelBindings = dataModelBindings; }

  public TextResourceBindings getTextResourceBindings() { return textResourceBindings; }

  public void setTextResourceBindings(TextResourceBindings textResourceBindings) { this.textResourceBindings = textResourceBindings; }
}
