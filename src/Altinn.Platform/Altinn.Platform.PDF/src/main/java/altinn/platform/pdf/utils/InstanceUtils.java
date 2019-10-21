package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.Data;
import altinn.platform.pdf.models.Instance;

import java.util.ArrayList;
import java.util.List;

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
    if (instance == null || instance.data == null || id == null) {
      return list;
    }

    for (Data data: instance.data) {
      if (id.equals(data.elementType)) {
        list.add(data.fileName);
      }
    }
    return list;
  }
}
