package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.TextResourceElement;
import altinn.platform.pdf.models.TextResources;
import com.google.gson.Gson;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.encoding.WinAnsiEncoding;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.*;
import java.lang.invoke.MethodHandles;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.chrono.IsoChronology;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.FormatStyle;
import java.time.temporal.TemporalAccessor;
import java.util.*;

public class TextUtils {

  private static Map<String,Map<String, String>> languages;
  private static String appOwnerKey = "appOwner";
  private static String appNameKey = "appName";
  private static String oldAppNameKey = "ServiceName";

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
   * Fetes app owner name. Tries to fetch from resources, fallbacks to name defined in orgs list from cdn
   * @param org the org short name
   * @param lang the users preferred language
   * @param textResources the app text resources
   * @return the app owner name
   */
  public static String getAppOwnerName(String org, String lang, TextResources textResources) {
    String appOwnerNameFromResources = getTextResourceByKey(appOwnerKey, textResources);
    if (!appOwnerNameFromResources.equals(appOwnerKey)) {
      return appOwnerNameFromResources;
    } else {
      return AltinnOrgUtils.getOrgFullNameByShortName(org, lang);
    }
  }

  /***
   * Gets the app name. Checks appName key, then fallbacks to ServiceName if not found for backward compatibility
   * @param textResources the text resources
   * @return
   */
  public static String getAppName(TextResources textResources) {
    String newAppName = getTextResourceByKey(appNameKey, textResources);
    if (!newAppName.equals(appNameKey)) {
      return newAppName;
    } else {
      return getTextResourceByKey(oldAppNameKey, textResources);
    }
  }

  /**
   * Removes illegal chars that pdf-generation does not handle
   * @param raw the unfiltered string
   * @return the filtered string
   */
  public static String removeIllegalChars(String raw) {
    if (raw == null) {
      return "";
    }
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < raw.length(); i++) {
        if (WinAnsiEncoding.INSTANCE.contains(raw.charAt(i)) ) {
            builder.append(raw.charAt(i));
        }
    }
    return builder.toString().replaceAll("\\p{Cntrl}", "");
  }

  /**
   * Gets the height needed for a given test based on the font and font size
   * @param text the text
   * @return the the height needed to fit the text
   */
  public static float getHeightNeededForText(String text, PDFont font, float fontSize, float width) throws IOException {
    float fontHeight = getFontHeight(font, fontSize);
    if (text == null || text.length() == 0) {
      return fontHeight;
    }
    List<String> lines = splitTextToLines(text, font, fontSize, width);
    int numberOfLines = lines.size();
    float heightNeeded = numberOfLines * fontHeight;
    if (lines.size() > 1) {
      // https://stackoverflow.com/a/17202929
      heightNeeded += ((numberOfLines - 1) * fontHeight * 0.865);
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
    float textHeight = getHeightNeededForText(text, font, fontSize, width);
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
          float subStringWidth = getStringWidth(subString, font, fontSize);
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
    return (font.getFontDescriptor().getCapHeight() / 1000 * fontSize);
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

  /**
   * Gets the instance guid from the instance id (instanceOwnerId/InstanceGuid)
   * @param instanceId the instanceId
   * @return the instanceGuid
   */
  public static String getInstanceGuid(String instanceId) {
    if (instanceId == null) {
      return "";
    }

    if (!instanceId.contains("/")) {
      return instanceId;
    }

    return instanceId.split("/")[1];
  }

  /**
   * Gets the a language value by key. If key is not found the key is returned.
   * @param key the key
   * @param languageCode the language to fetch from
   */
  public static String getLanguageStringByKey(String key, String languageCode) {
    if (languages == null) {
      return key;
    }
    if (languages.get(languageCode) == null) {
      return key;
    }
    String value = languages.get(languageCode).get(key);
    return (value != null) ? value : key;
  }

  /**
   * Reads all the language files and puts them in a lang map
   * @return a map of languages with corresponding texts
   */
  public static Map<String, Map<String, String>> readLanguageFiles() throws IOException {
    ClassLoader classLoader = MethodHandles.lookup().getClass().getClassLoader();
    PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver(classLoader);
    Resource[] resources = resolver.getResources("classpath:language/*.json");

    Map<String, Map<String, String>> languagesMap = new HashMap<>();
    Gson gson = new Gson();
    for (final Resource resource: resources) {
      String langCode = resource.getFilename().split("\\.")[0];
      try (
        InputStreamReader inputStreamReader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8);
        BufferedReader bufferedReader = new BufferedReader(inputStreamReader);
      ) {
        Map<String, String> langMap = gson.fromJson(bufferedReader, Map.class);
        languagesMap.put(langCode, langMap);
      }
    }
    return languagesMap;
  }

  /**
   * initializes the languages
   */
  public static void initializeLanguages() throws IOException {
    languages = readLanguageFiles();
  }

  /**
   * Formats a date to the user lang. The date value can be a ISO date-time or a  ISO date
   * ISO date time format example: 2020-09-11T12:00:00.000+02:00
   * ISO date format example: 2020-09-11
   * @param value a date, could be a ISO instant or ISO date
   * @return the formatted date
   */
  public static String getDateFormat(String value, String language) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    Locale locale;
    if (language == null || language.isEmpty()) {
      locale = new Locale("nb");
    } else {
      locale = new Locale(language);
    }

    String pattern =
        DateTimeFormatterBuilder
          .getLocalizedDateTimePattern
            ( FormatStyle.SHORT
              , null
              , IsoChronology.INSTANCE
              , locale
            );
    pattern = pattern.replace("yy", "yyyy");

    if (value.length() > 10) {
      TemporalAccessor ta = DateTimeFormatter.ISO_DATE_TIME.parse(value);
      return DateTimeFormatter.ofPattern(pattern).withLocale(locale).format(ta);
    } else {
      LocalDate date = LocalDate.parse(value, DateTimeFormatter.ISO_DATE);
      return date.format(DateTimeFormatter.ofPattern(pattern).withLocale(locale));
    }
  }
}
