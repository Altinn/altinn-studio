package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.Data;
import altinn.platform.pdf.models.Instance;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class InstanceUtils {

  private InstanceUtils() {}

  /***
   * Gets a list of attachments in an instance based on the file upload component id
   * @param id the component id
   * @param instance the instance
   * @return a list of filenames
   */
  public static List<String> getAttachmentsByComponentId(String id, Instance instance) {
    List<String> list = new ArrayList<>();
    if (instance == null || instance.getData() == null || id == null) {
      return list;
    }

    for (Data data: instance.getData()) {
      if (id.equals(data.getDataType())) {
        list.add(TextUtils.removeIllegalChars(data.getFilename()));
      }
    }
    return list;
  }

  /***
   * Gets a map of attachments and their tags in an instance based on the file upload component id
   * @param id the component id
   * @param instance the instance
   * @return a map of filenames and corresponding tags
   */
  public static Map<String, List<String>> getAttachmentsAndTagsByComponentId(String id, Instance instance) {
    Map<String, List<String>> map = new HashMap<String, List<String>>();
    if (instance == null || instance.getData() == null || id == null) {
      return map;
    }

    for (Data data: instance.getData()) {
      if (id.equals(data.getDataType())) {
        map.put(TextUtils.removeIllegalChars(data.getFilename()), data.getTags());
      }
    }
    return map;
  }

  /**
   * Gets the instance name
   * @param instance the instance
   * @return the name, or empty string if not found
   */
  public static String getInstanceName(Instance instance) {
    if (instance == null)  {
      return "";
    }

    if (instance.getTitle() != null) {
      return instance.getTitle().getNb();
    }

    return "";
  }
}
