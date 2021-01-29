package altinn.platform.pdf.utils;

import java.util.Map;

public class MapUtils {
  private MapUtils() {
  }

  public static String getLabelFromValue(Map<String, Map<String,String>> optionsDictionary, String optionsId, String value){

    Map<String,String> options = optionsDictionary.get(optionsId);
//Map<String, String> option =  options.getOptions();
    if(options != null){
      for (Map.Entry<String, String> entry :options.entrySet()) {
        if(entry.getValue().equals((value))){
          return entry.getKey();
        }
      }
    }

    return value;
  }
}
