package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.TextResourceElement;
import altinn.platform.pdf.models.TextResources;
import org.apache.pdfbox.pdmodel.font.PDFont;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class TextUtils {

  private TextUtils() {}

  /**
   * Fetches a text resource by key
   * @param key the text resource key
   * @param textResources the text resources
   * @return the text resource, or the key if resource is not defined
   */
  public static String getTextResourceByKey(String key, TextResources textResources) {
    if (textResources == null || textResources.getResources() == null) {
      return key;
    }
    for (TextResourceElement resource: textResources.getResources()) {
      if (resource.getId().equals(key)) {
        return resource.getValue();
      }
    }
    return key;
  }

  /**
   * Gets the height needed for a given test based on the font and font size
   * @param text the text
   * @return the the height needed to fit the text
   */
  public static float getHeightNeededForText(String text, PDFont font, float fontSize, float width, float leading) throws IOException {
    float fontHeight = getFontHeight(font, fontSize);
    if (text == null || text.length() == 0) {
      return fontHeight;
    }
    List<String> lines = splitTextToLines(text, font, fontSize, width);
    int numberOfLines = lines.size();
    float heightNeeded = numberOfLines * fontHeight;
    if (lines.size() > 1) {
      float leadingDiff = (leading - fontHeight);
      heightNeeded += ((numberOfLines - 1) * leadingDiff);
    }
    return heightNeeded;
}

  /**
   * Gets the height needed for a multi line text box
   * @param text the text
   * @param font the font
   * @param fontSize the font size
   * @param width the width
   * @param leading the leading space
   * @return the height need in pixels
   * @throws IOException
   */
  public static float getHeightNeededForTextBox(String text, PDFont font, float fontSize, float width, float leading) throws IOException {
    float textHeight = getHeightNeededForText(text, font, fontSize, width, leading);
    float leadingDiff = (leading - fontSize);
    return textHeight + leadingDiff*2;
  }

  /**
   * Splits a text string into suitable lines which will fit inside the pdf. Natural break points on spaces are used, but
   * words that are wider than the width have to ble split into multiple lines.
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
    for (String lineInText: text.split("\n")) {
      int lastSpace = -1;
      while (lineInText.length() > 0) {
        int spaceIndex = lineInText.indexOf(' ', lastSpace  + 1);
        if (spaceIndex < 0) {
          // no spaces found => the line contains the whole word
          spaceIndex = lineInText.length();
        }
        String subString = lineInText.substring(0, spaceIndex);
        float stringWidth = getStringWidth(subString, font, fontSize);
        if (stringWidth > width) {
          if (lastSpace < 0) {
            lastSpace = spaceIndex;
          }
          subString = lineInText.substring(0, lastSpace);
          float subStringWidth = fontSize * font.getStringWidth(subString) / 1000;
          if (subStringWidth > width) {
            // the word is wider than the width, we need to split the word itself
            List<String> splittedWord = splitWordToFitWidth(subString, font, fontSize, width);
            for (String line: splittedWord) {
              lines.add(line);
            }
          } else {
            lines.add(subString);
          }
          lineInText = lineInText.substring(lastSpace).trim();
          lastSpace = -1;
        }
        else if (spaceIndex == lineInText.length()) {
          lines.add(lineInText);
          lineInText = "";
        }
        else {
          lastSpace = spaceIndex;
        }
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

  /***
   * Splits a word to the number if lines it needs to fit inside the given width
   * @param word the word
   * @param font the font
   * @param fontSize the font size
   * @param width the width
   * @return a list of lines needed to fit word
   */
  public static List<String> splitWordToFitWidth(String word, PDFont font, float fontSize, float width) throws IOException {
    List<String> lines = new ArrayList();
    if (word == null || font == null) {
      return lines;
    }
    float wordWidth = getStringWidth(word, font, fontSize);
    if (wordWidth < width) {
      lines.add(word);
      return lines;
    }

    int start = 0;

    for(int i = 2; i <= word.length(); i ++) {
      String subString = word.substring(start, i); // inclusive, exclusive
      if (getStringWidth(subString, font, fontSize) > width) {
        lines.add(word.substring(start, i));
        start = i;
      }
      if (i == word.length()) {
        lines.add(word.substring(start, i));
      }
    }

    return lines;
  }

  /***
   * Gets the string width
   * @param word the string
   * @param font the font
   * @param fontSize the font size
   * @return the width in pixels
   * @throws IOException
   */
  public static float getStringWidth(String word, PDFont font, float fontSize) throws IOException {
    return fontSize * font.getStringWidth(word) / 1000;
  }
}
