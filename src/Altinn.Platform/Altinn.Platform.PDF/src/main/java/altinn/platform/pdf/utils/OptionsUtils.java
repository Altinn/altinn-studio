package altinn.platform.pdf.utils;

import java.util.Map;

import altinn.platform.pdf.models.Options;

public class OptionsUtils {
  private OptionsUtils() {
  }

  public static String getLabelFromValue(Map<String, Options> optionsDictionary, String optionsId, String value){

   Options options = optionsDictionary.get(optionsId);
Map<String, String> option =  options.getOptions();
    if(options != null){
      for (Map.Entry<String, String> entry :option.entrySet()) {
        if(entry.getValue().equals((value))){
          return entry.getKey();
        }
      }
    }

    return value;
  }
}
