package altinn.platform.pdf.models;

import java.util.HashMap;
import java.util.Map;

public class Options{
  private Map<String, String> options = new HashMap<String, String>();

  public Map<String, String> getOptions(){return options;}

  public void setOptions(Map<String, String> options){
      this.options = options;
  }
}
