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
    if (instance == null || instance.getData() == null || id == null) {
      return list;
    }

    for (Data data: instance.getData()) {
      if (id.equals(data.getDataType())) {
        list.add(data.getFilename());
      }
    }
    return list;
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
