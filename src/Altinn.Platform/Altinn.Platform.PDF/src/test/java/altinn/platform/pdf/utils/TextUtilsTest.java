package altinn.platform.pdf.utils;

import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

import java.io.IOException;
import java.util.Map;

public class TextUtilsTest extends TestCase {

    public TextUtilsTest( String testName )
    {
      super( testName );
    }

    public static Test suite()
    {
      return new TestSuite( altinn.platform.pdf.utils.TextUtilsTest.class );
    }

    public void testGetDateFormatForDateTime_NB()
    {
      String value = "2020-09-11T12:00:00.000+02:00";
      String result = TextUtils.getDateFormat(value, "nb");
      String expectedResult = "11.09.2020";
      assertEquals(expectedResult, result);
    }

    public void testGetDateFormatForDateTime_NN()
    {
      String value = "2020-09-11T12:00:00.000+02:00";
      String result = TextUtils.getDateFormat(value, "nn");
      String expectedResult = "11.09.2020";
      assertEquals(expectedResult, result);
    }

    public void testGetDateFormatForDateTime_EN()
    {
      String value = "2020-09-11T12:00:00.000+02:00";
      String result = TextUtils.getDateFormat(value, "en");
      String expectedResult = "9/11/2020";
      assertEquals(expectedResult, result);
    }

    public void testGetDateFormatForDate_NB()
    {
      String value = "2020-09-19";
      String result = TextUtils.getDateFormat(value, "nb");
      String expectedResult = "19.09.2020";
      assertEquals(expectedResult, result);
    }

  public void testGetDateFormatForDate_NN() {
    String value = "2020-09-19";
    String result = TextUtils.getDateFormat(value, "nn");
    String expectedResult = "19.09.2020";
    assertEquals(expectedResult, result);
  }

    public void testGetDateFormatForDate_EN()
    {
      String value = "2020-09-19";
      String result = TextUtils.getDateFormat(value, "en");
      String expectedResult = "9/19/2020";
      assertEquals(expectedResult, result);
    }

    public void testReadLanguageFiles() throws IOException {
      Map<String, Map<String, String>> languages = TextUtils.readLanguageFiles();
      assertEquals("House number", languages.get("en").get("house_number"));
      assertEquals("Bustadnummer", languages.get("nn").get("house_number"));
      assertEquals("Bolignummer", languages.get("nb").get("house_number"));
    }

    public void testRemoveIllegalCharsShouldRemoveIllegalChars() {
      String unfiltered = "\u0600\u0601\u0602\u0603\u0604\u0605\u061C\u06DD\u070F\u180E\u200B\u200C\u200D\u200E\u200F\u202A\u202B\u202C\u202D\u202E\u2060\u2061this is ok";
      String filtered = TextUtils.removeIllegalChars(unfiltered);
      String expected = "this is ok";
      assertEquals(expected, filtered);
    }

    public void testRemoveIllegalCharsShouldLeaveValidCharsUntouched() {
      String unfiltered = "Dette er en tekst som bør gå helt fint og ingenting skal være i veien med noe slikt.";
      String filtered = TextUtils.removeIllegalChars(unfiltered);
      assertEquals(unfiltered, filtered);
    }
}
