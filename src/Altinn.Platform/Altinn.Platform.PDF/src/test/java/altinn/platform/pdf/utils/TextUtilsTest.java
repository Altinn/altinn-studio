package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.TextResourceElement;
import altinn.platform.pdf.models.TextResources;
import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
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
      String unfiltered1 = "this is ok\u0600\u0601\u0602\u0603\u0604\u0605\u061C\u06DD\u070F\u180E\u200B\u200C\u200D\u200E\u200F\u202A\u202B\u202C\u202D\u202E\u2060\u2061";
      String filtered1 = TextUtils.removeIllegalChars(unfiltered1);
      String expected1 = "this is ok";

      String unfiltered2 = "this is also ok\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\u000E\u000F\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F\u007F\n";
      String filtered2 = TextUtils.removeIllegalChars(unfiltered2);
      String expected2 = "this is also ok";

      String unfiltered3 = "all goodЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя";
      String filtered3 = TextUtils.removeIllegalChars(unfiltered3);
      String expected3 = "all good";

      String unfiltered4 = "fineﾟ･✿ヾ╲(｡◕‿◕｡)╱✿･ﾟ\n";
      String filtered4 = TextUtils.removeIllegalChars(unfiltered4);
      String expected4 = "fine()";

      assertEquals(expected1, filtered1);
      assertEquals(expected2, filtered2);
      assertEquals(expected3, filtered3);
      assertEquals(expected4, filtered4);
    }

    public void testRemoveIllegalCharsShouldLeaveValidCharsUntouched() {
      String unfiltered = "Dette er en tekst som bør gå helt fint og ingenting skal være i veien med noe slikt.";
      String filtered = TextUtils.removeIllegalChars(unfiltered);
      assertEquals(unfiltered, filtered);
    }

    public void testGetAppOwnerNameShouldReturnValueFromResourcesIfResourcesHasAppOwnerKey() {
      TextResources textResources = new TextResources();
      TextResourceElement appOwnerKey = new TextResourceElement();
      appOwnerKey.setValue("AppOwnerNameFromResource");
      appOwnerKey.setId("appOwner");
      textResources.setResources(Arrays.asList(appOwnerKey));

      String result = TextUtils.getAppOwnerName("ttd", "nb", textResources);

      String expected = "AppOwnerNameFromResource";
      assertEquals(expected, result);

    }

  public void testGetAppOwnerNameShouldReturnValueFromCdnIfResourcesHasNoAppOwnerKey() {
    TextResources textResources = new TextResources();
    textResources.setResources(new ArrayList<>());

    String result = TextUtils.getAppOwnerName("ttd", "nb", textResources);

    String expected = "ttd"; // expected as orgs list is not fetched
    assertEquals(expected, result);
  }

  public void testGetAppNameShouldReturnAppNameIfKeyPresent() {
    TextResources textResources = new TextResources();
    TextResourceElement appOwnerKey = new TextResourceElement();
    appOwnerKey.setValue("AppNameFromNewKey");
    appOwnerKey.setId("appName");
    textResources.setResources(Arrays.asList(appOwnerKey));

    String result = TextUtils.getAppName(textResources);

    String expected = "AppNameFromNewKey";
    assertEquals(expected, result);
  }

  public void testGetAppNameShouldReturnServiceNameAsFallback() {
    TextResources textResources = new TextResources();
    TextResourceElement appOwnerKey = new TextResourceElement();
    appOwnerKey.setValue("AppNameFromOldKey");
    appOwnerKey.setId("ServiceName");
    textResources.setResources(Arrays.asList(appOwnerKey));

    String result = TextUtils.getAppName(textResources);

    String expected = "AppNameFromOldKey";
    assertEquals(expected, result);
  }


}
