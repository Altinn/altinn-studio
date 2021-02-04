package altinn.platform.pdf.utils;

import java.util.Map;

public class MapUtils {
  private MapUtils() {
  }

  public static String getLabelFromValue(Map<String, Map<String, String>> dict, String outerKey, String innerValue) {

    Map<String, String> options = dict.get(outerKey);

    if (options != null) {
      for (Map.Entry<String, String> entry : options.entrySet()) {
        if (entry.getValue().equals((innerValue))) {
          return entry.getKey();
        }
      }
    }

    return innerValue;
  }
}
