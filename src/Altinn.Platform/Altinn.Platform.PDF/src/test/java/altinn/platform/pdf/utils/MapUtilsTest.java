package altinn.platform.pdf.utils;

import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

import java.io.IOException;
import java.util.Dictionary;
import java.util.HashMap;
import java.util.Map;


public class MapUtilsTest extends TestCase {

  public MapUtilsTest(String testName) {
    super(testName);
  }

  public static Test suite() {
    return new TestSuite(altinn.platform.pdf.utils.MapUtilsTest.class);
  }

  public static Map<String, Map<String, String>> Dictionary = new HashMap<String, Map<String, String>>() {{
    put("listOptions", new HashMap<String, String>() {{
      put("radio.1", "Ja");
      put("radio.2", "Nei");
    }});
    put("radioButtonOptions", new HashMap<String, String>() {{
      put("list.option1", "Oppsigelse");
      put("list.option2", "Avskjed");
      put("list.option3", "Pensjonert");
      put("list.option4", "Annet");
    }});
  }};

  public void testGetLabelFromValueFindsMatch() {
    // Arrange
    String outerKey = "radioButtonOptions";
    String innerValue = "Oppsigelse";
    String expectedResult = "list.option1";

    // Act
    String result = MapUtils.getLabelFromValue(Dictionary, outerKey, innerValue);

    // Assert
    assertEquals(expectedResult, result);
  }

  public void testGetLabelFromValueNoMatchOptionId() {
    // Arrange
    String outerKey = "invalidKey";
    String innerValue = "Oppsigelse";
    String expectedResult = "Oppsigelse";

    // Act
    String result = MapUtils.getLabelFromValue(Dictionary, outerKey, innerValue);

    // Assert
    assertEquals(expectedResult, result);
  }

  public void testGetLabelFromValueNoMatchInnerValue() {
    // Arrange
    String outerKey = "radioButtonOptions";
    String innerValue = "invalidValue";
    String expectedResult = "invalidValue";

    // Act
    String result = MapUtils.getLabelFromValue(Dictionary, outerKey, innerValue);

    // Assert
    assertEquals(expectedResult, result);
  }

}
