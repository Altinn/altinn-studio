package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.FormLayoutElement;
import org.apache.tomcat.util.codec.binary.Base64;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class FormUtils {

  private static final String GROUP_NAME = "group";
  private FormUtils() {}

  /**
   * Returns the data data for a given data binding
   * @param key the data binding key
   * @param formData the data data
   * @return the connected data data, or empty string if not defined
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
    return TextUtils.removeIllegalChars(value);
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

    int indexCounter = -1; // for some data models we need to find a given child by index
    for (int i = 0; i < childNodes.getLength(); i++) {
      Node childNode = childNodes.item(i);
      String nodeName = childNode.getNodeName();
      nodeName = nodeName.replace("-", "").toLowerCase();
      String key = keys[keyIndex].replace("-", "").toLowerCase();
      int groupIndex;
      if (key.contains("[")) {
        // The key have an index
        groupIndex = Integer.parseInt(key.substring(key.indexOf("[") + 1, key.indexOf("]")));
        key = key.replace("[" + groupIndex + "]", "");
      } else {
        groupIndex = 0;
      }
      if (nodeName == null) {
        continue;
      }
      if (nodeName.equals(key)) {
        // We have a match.
        indexCounter ++;
      }
      if (nodeName.equals(key) && indexCounter == groupIndex) {
        if ((keys.length - 1) == keyIndex) {
          // If no more partial keys we have reached bottom node, return value if present
          String value;
          if (childNode.getFirstChild() != null) {
            value = childNode.getFirstChild().getNodeValue();
          }
          else {
            value = childNode.getNodeValue();
          }
          if (value != null) {
            return value;
          } else {
            return "";
          }
        } else {
          // We keep digging
          return getValueOfEndNode(childNode, keys, keyIndex + 1);
        }
      }
    }
    return "";
  }

  /**
   * Gets the the filtered layout. Removes all components which should be rendered as part of groups.
   * In the future this method should be extended to include filtering away hidden components when we support dynamics.
   * @param layout the form layout
   * @return the filtered form layout
   */
  public static List<FormLayoutElement> getFilteredLayout(List<FormLayoutElement> layout) {
    if (layout == null) {
      return Collections.emptyList();
    }
    List<String> renderedInGroup = new ArrayList<>();
    layout.stream()
      .filter(formLayoutElement -> formLayoutElement.getType().equalsIgnoreCase(GROUP_NAME))
      .forEach(formLayoutElement -> formLayoutElement.getChildren().forEach(renderedInGroup::add));

    return layout.stream().
      filter(formLayoutElement -> !renderedInGroup.contains(formLayoutElement.getId()))
      .collect(Collectors.toList());
  }

  /**
   * Setup repeating groups. Finds the number of iterations for a given group in the by looking at how many iterations the data model binding has in the form data
   * @param layout the form layout
   * @param formData the form data
   * @return a form layout list where the group counts have been initialized
   */
  public static List<FormLayoutElement> setupRepeatingGroups(List<FormLayoutElement> layout, Document formData) {
    List<FormLayoutElement> initiated = new ArrayList<>();
    if (layout == null || formData == null) {
      return initiated;
    }

    List<FormLayoutElement> groups = layout.stream().filter(formLayoutElement -> formLayoutElement.getType().equalsIgnoreCase(GROUP_NAME)).collect(Collectors.toList());
    // filter away groups that should be rendered as child groups
    List<FormLayoutElement> filtered = layout
      .stream()
      .filter(formLayoutElement -> !(formLayoutElement.getType().equalsIgnoreCase(GROUP_NAME) && groups.stream().anyMatch(group -> (group.getChildren() != null && group.getChildren().contains(formLayoutElement.getId())))))
      .collect(Collectors.toList());

    filtered.forEach(formLayoutElement -> {
      if (formLayoutElement.getType().equalsIgnoreCase(GROUP_NAME)) {
        String parentGroupBinding = formLayoutElement.getDataModelBindings().get(GROUP_NAME);
        formLayoutElement.setCount(getGroupCount(parentGroupBinding, formData));
        List<FormLayoutElement> groupChildren = getChildGroups(formLayoutElement, layout);
        initiated.add(formLayoutElement);
        if (!groupChildren.isEmpty()) {
          groupChildren.forEach(groupChild -> {
            for (int i = 0; i < formLayoutElement.getCount(); i ++) {
              FormLayoutElement copy = new FormLayoutElement();
              copy.setType(GROUP_NAME);
              copy.setId(groupChild.getId() + "-" + i);
              copy.setChildren(groupChild.getChildren());
              HashMap<String, String> copyDataModelBindings = new HashMap<>();
              String childGroupBinding = groupChild.getDataModelBindings().get(GROUP_NAME);
              String indexedChildGroupBinding = childGroupBinding.replace(parentGroupBinding, parentGroupBinding + "[" + i + "]");
              copyDataModelBindings.put(GROUP_NAME, indexedChildGroupBinding);
              copy.setDataModelBindings(copyDataModelBindings);
              copy.setCount(getGroupCount(indexedChildGroupBinding, formData));
              if (copy.getCount() > 0) {
                initiated.add(copy);
              }
            }
          });
        }
      }
    });
    return initiated;
  }

  /**
   * finds child groups of a given group
   * @param group the group
   * @param layout the form layout
   * @return a list of child groups, empty if no child is a group
   */
  public static List<FormLayoutElement> getChildGroups(FormLayoutElement group, List<FormLayoutElement> layout) {
    List<FormLayoutElement> childGroups = new ArrayList<>();
    if (group == null || group.getChildren() == null || layout == null) {
      return childGroups;
    }
    List<String> children = group.getChildren();
    layout.forEach(layoutElement -> {
      if (layoutElement.getType().equalsIgnoreCase(GROUP_NAME) && children.contains(layoutElement.getId())) {
        childGroups.add(layoutElement);
      }
    });
    return childGroups;
  }

  /**
   * Gets the number of repetitions a given group has in the form data
   * @param group the group
   * @param formData the form data
   * @return number of repetitions for a given group
   */
  public static int getGroupCount(String group, Document formData) {
    if (group == null || formData == null) {
      return 0;
    }

    int bracketIndex = group.indexOf("[");
    if (bracketIndex > -1) {
      int parentGroupIndex = Integer.parseInt(group.substring(bracketIndex + 1 , bracketIndex + 2));
      String[] split = group.split(Pattern.quote("."));
      String groupName = split[split.length -1];
      String parentGroup = "";
      for (String s: split) {
        if (s.contains("[")) {
          parentGroup = s.replace("[" + parentGroupIndex + "]", "");
        }
      }
      NodeList groups = formData.getElementsByTagName(parentGroup);
      NodeList children = groups.item(parentGroupIndex).getChildNodes();
      int count = 0;
      for (int i = 0; i < children.getLength(); i++) {
        if (children.item(i).getNodeName().equals(groupName)) {
          count ++;
        }
      }
      return count;
    }
    else {
      String[] split = group.split(Pattern.quote("."));
      return formData.getElementsByTagName(split[split.length - 1]).getLength();
    }
  }

  /**
   * Parses the base 64 encoded xml file and creates a Document wrapper
   * @param xmlBaseEncoded the base 64 xml string
   * @return a document wrapper for the xml file
   * @throws ParserConfigurationException
   * @throws IOException
   * @throws SAXException
   */
  public static Document parseXml(String xmlBaseEncoded) throws ParserConfigurationException, IOException, SAXException {
    byte[] xmlAsBytes = Base64.decodeBase64(xmlBaseEncoded);
    String xmlAsString = new String(xmlAsBytes, StandardCharsets.UTF_8);
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
    DocumentBuilder builder = factory.newDocumentBuilder();
    return builder.parse(new InputSource(new StringReader(xmlAsString)));
  }
}

