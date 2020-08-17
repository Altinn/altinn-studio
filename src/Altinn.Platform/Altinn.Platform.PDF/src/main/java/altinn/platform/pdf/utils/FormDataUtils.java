package altinn.platform.pdf.utils;

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
import java.util.regex.Pattern;

public class FormDataUtils {

  private FormDataUtils() {}

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
    return getValueOfEndNode(rootElement, keySplit, 0);
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
      nodeName = nodeName.replace("-", "").toLowerCase();
      if (nodeName == null) {
        continue;
      }
      if (nodeName.equals(keys[keyIndex].replace("-", "").toLowerCase())) {
        if ((keys.length - 1) == keyIndex) {
          // If no more partial keys we have reached bottom node, return value if present
          String value = null;
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
          return getValueOfEndNode(childNode, keys, keyIndex + 1 );
        }
      }
    }
    return "";
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

