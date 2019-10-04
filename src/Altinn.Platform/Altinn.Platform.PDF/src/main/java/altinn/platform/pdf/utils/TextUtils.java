package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.TextResourceElement;
import altinn.platform.pdf.models.TextResources;
import org.apache.pdfbox.pdmodel.font.PDFont;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class TextUtils {

  /**
   * Fetches a text resource by key
   * @param key the text resource key
   * @param textResources the text resources
   * @return the text resource, or the key if resource is not defined
   */
  public static String getTextResourceByKey(String key, TextResources textResources) {
    if (textResources == null || textResources.resources == null) {
      return key;
    }
    for (TextResourceElement resource: textResources.resources) {
      if (resource.id.equals(key)) {
        return resource.value;
      }
    }
    return key;
  }

  /**
   * Gets the number of needed lines for a given text and font
   * @param text the text
   * @return the number of lines needed to make room for the text
   */
  public static float getHeightNeededForText(String text, PDFont font, float fontSize, float width) throws IOException {
    if (text == null || text.length() == 0) {
      return 1;
    }
    float fontHeight = getFontHeight(font, fontSize);
    List<String> lines = splitTextToLines(text, font, fontSize, width);
    float heightNeeded = lines.size() * fontHeight;
    if (lines.size() > 1) {
      heightNeeded *= 1.2;
    }
    return heightNeeded;
}

  /**
   * Splits a text string into suitable lines which will fit inside the pdf
   * @param text the text
   * @param font the font used
   * @param fontSize the font size
   * @param width the width of the page
   * @return a list of lines
   */
  public static List<String> splitTextToLines(String text, PDFont font, float fontSize, float width) throws IOException {
    List<String> lines = new ArrayList<>();
    if (text == null || text.length() == 0) {
      return lines;
    }

    int lastSpace = -1;
    while (text.length() > 0) {
      int spaceIndex = text.indexOf(' ', lastSpace  + 1);
      if (spaceIndex < 0) {
        // no spaces found => place whole word on line
        spaceIndex = text.length();
      }
      String subString = text.substring(0, spaceIndex);
      float stringWidth = fontSize * font.getStringWidth(subString) / 1000;
      if (stringWidth > width) {
        if (lastSpace < 0) {
          lastSpace = spaceIndex;
        }
        subString = text.substring(0, lastSpace);
        lines.add(subString);
        text = text.substring(lastSpace).trim();
        lastSpace = -1;
      }
      else if (spaceIndex == text.length()) {
        lines.add(text);
        text = "";
      }
      else {
        lastSpace = spaceIndex;
      }
    }

    return lines;
  }

  /***
   * Gets the font height in pixels
   * @param font the font
   * @param fontSize the font size
   * @return the height
   */
  public static float getFontHeight(PDFont font, float fontSize) {
    return font.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * fontSize;
  }
}
