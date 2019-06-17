package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.TextResourceElement;
import altinn.platform.pdf.models.TextResources;

public class TextUtils {

  /**
   * Fetches a text resource by key
   * @param key the text resource key
   * @param textResources the text resources
   * @return the text resource, or the key if resource is not defined
   */
  public static String getTextResourceByKey(String key, TextResources textResources) {
    if (textResources == null || textResources.resources == null) {
      return key;
    }
    for (TextResourceElement resource: textResources.resources) {
      if (resource.id.equals(key)) {
        return resource.value;
      }
    }
    return key;
  }
}
