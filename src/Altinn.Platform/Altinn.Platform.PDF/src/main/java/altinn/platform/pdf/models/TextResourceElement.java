package altinn.platform.pdf.models;

import java.util.List;

public class TextResourceElement {
  private String id;
  private String value;
  private List<TextResourceVariableElement> variables;

  public String getId() {
    return id;
  }

  public void setId(String id) { this.id = id; }

  public String getValue() { return value; }

  public void setValue(String value) { this.value = value; }

  public List<TextResourceVariableElement> getVariables(){ return this.variables; }

  public void setVariables(List<TextResourceVariableElement> variables) {this.variables = variables; }
}
