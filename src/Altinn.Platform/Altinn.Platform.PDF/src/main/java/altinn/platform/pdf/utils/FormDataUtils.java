package altinn.platform.pdf.utils;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.util.regex.Pattern;

public class FormDataUtils {

  /**
   * Returns the form data for a given data binding
   * @param key the data binding key
   * @param formData the form data
   * @return the connected form data, or empty string if not defined
   */
  public static String getFormDataByKey(String key, Document formData) {
    if (key == null || formData == null) {
      return "";
    }
    if (key.contains(".value")) {
      key = key.replace(".value", "");
    }
    String[] keySplit = key.split(Pattern.quote("."));
    Element rootElement = formData.getDocumentElement();
    String value = getValueOfEndNode(rootElement, keySplit, 0);
    return value;
  }

  /**
   * Looks for the value of the end node in a series of nested elements. Calls itself recursively.
   * @param parentNode the parent node
   * @param keys the keys of nested element, parent starting at n, child at (n+1)
   * @param keyIndex the index of the current element we are looking for
   * @return the value if found, or empty string otherwise
   */
  public static String getValueOfEndNode(Node parentNode, String[] keys, int keyIndex) {
    if (parentNode == null || keys == null || keyIndex > (keys.length - 1)) {
      return "";
    }
    NodeList childNodes = parentNode.getChildNodes();
    if (childNodes == null || childNodes.getLength() == 0) {
      return "";
    }
    for (int i = 0; i < childNodes.getLength(); i++) {
      Node childNode = childNodes.item(i);
      String nodeName = childNode.getNodeName();
      if (nodeName == null) {
        continue;
      }
      if (nodeName.equals(keys[keyIndex])) {
        if ((keys.length - 1) == keyIndex) {
          // If no more partial keys we have reached bottom node, return value if present
          String value = childNode.getFirstChild().getNodeValue();
          if (value != null) {
            return value;
          } else {
            return "";
          }
        } else {
          // We keep digging
          return getValueOfEndNode(childNode, keys, keyIndex + 1 );
        }
      }
    }
    return "";
  }
}

