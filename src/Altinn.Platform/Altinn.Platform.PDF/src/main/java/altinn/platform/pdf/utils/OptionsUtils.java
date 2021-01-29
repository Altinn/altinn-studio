package altinn.platform.pdf.utils;

import java.util.HashMap;
import java.util.Map;

import altinn.platform.pdf.models.OptionsDictionary;

public class OptionsUtils {
  private OptionsUtils() {}

  public static String getLabelFromValue(OptionsDictionary optionsDictionary, String optionsId, String value){

    HashMap<String, String> options = optionsDictionary.getOptions(optionsId);

    if(options != null){
      for (Map.Entry<String, String> entry : options.entrySet()) {
        if(entry.getValue().equals((value))){
          return entry.getKey();
        }
      }
    }

    return value;
  }
}
