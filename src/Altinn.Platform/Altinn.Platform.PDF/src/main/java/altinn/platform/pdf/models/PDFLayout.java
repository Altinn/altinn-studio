package altinn.platform.pdf.models;

import java.util.ArrayList;
import java.util.List;

public class PDFLayout {
  public String backgroundColor;
  public String modalColor;
  public int spacingComponents;
  public List<PDFLayoutElement> elements;

  public PDFLayout() {
    this.elements = new ArrayList<PDFLayoutElement>();
  }
}
