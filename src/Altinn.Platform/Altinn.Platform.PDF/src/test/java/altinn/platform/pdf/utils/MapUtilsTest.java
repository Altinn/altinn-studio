package altinn.platform.pdf.utils;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;


class MapUtilsTest {

  public static Map<String, Map<String, String>> Dictionary = new HashMap<>() {{
    put("listOptions", new HashMap<>() {{
      put("radio.1", "Ja");
      put("radio.2", "Nei");
    }});
    put("radioButtonOptions", new HashMap<>() {{
      put("list.option1", "Oppsigelse");
      put("list.option2", "Avskjed");
      put("list.option3", "Pensjonert");
      put("list.option4", "Annet");
    }});
  }};

  @Test
  void testGetLabelFromValueFindsMatch() {
    // Arrange
    String outerKey = "radioButtonOptions";
    String innerValue = "Oppsigelse";
    String expectedResult = "list.option1";

    // Act
    String result = MapUtils.getLabelFromValue(Dictionary, outerKey, innerValue);

    // Assert
    assertEquals(expectedResult, result);
  }

  @Test
  void testGetLabelFromValueNoMatchOptionId() {
    // Arrange
    String outerKey = "invalidKey";
    String innerValue = "Oppsigelse";
    String expectedResult = "Oppsigelse";

    // Act
    String result = MapUtils.getLabelFromValue(Dictionary, outerKey, innerValue);

    // Assert
    assertEquals(expectedResult, result);
  }

  @Test
  void testGetLabelFromValueNoMatchInnerValue() {
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
