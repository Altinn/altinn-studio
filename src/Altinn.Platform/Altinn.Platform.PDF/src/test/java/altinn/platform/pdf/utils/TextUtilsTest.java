package altinn.platform.pdf.utils;

import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

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

    public void testGetDateFormatForDate_NN()
    {
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

}
