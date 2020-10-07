package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.FormLayoutElement;
import altinn.platform.pdf.models.Instance;
import altinn.platform.pdf.models.TextResourceBindings;
import altinn.platform.pdf.models.TextResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.w3c.dom.Document;

import java.io.IOException;
import java.util.List;

public class LayoutUtils {

  private LayoutUtils() {}


  /**
   * Get the height needed to the element, including title, description and content
   * @param element the element
   * @param font the font used
   * @param fontSize the font size
   * @param width the width
   * @param leading the leading
   * @param textMargin the text margin
   * @param textResources the text resources
   * @param formData the form data
   * @param instance the instance metadata
   * @return
   * @throws IOException
   */
  public static float getElementHeight(FormLayoutElement element, PDFont font, float fontSize, float width, float leading, float textMargin, TextResources textResources, Document formData, Instance instance) throws IOException {
    float height = 0;
    TextResourceBindings textResourceBindings = element.getTextResourceBindings();
    if (textResourceBindings.getTitle() != null && !textResourceBindings.getTitle().isEmpty()) {
      String title = TextUtils.getTextResourceByKey(textResourceBindings.getTitle(), textResources);
      height += TextUtils.getHeightNeededForText(title, font, fontSize, width);
      height += textMargin;
    }

    if (textResourceBindings.getDescription() != null && !textResourceBindings.getDescription().isEmpty()) {
      String description = TextUtils.getTextResourceByKey(textResourceBindings.getDescription(), textResources);
      height += TextUtils.getHeightNeededForText(description, font, fontSize, width);
      height += textMargin;
    }

    if (element.getType().equalsIgnoreCase("paragrah") || element.getType().equalsIgnoreCase("header")) {
      // have no content, return height
      return height;
    }

    if (element.getType().equalsIgnoreCase("fileupload")) {
      List<String> lines = InstanceUtils.getAttachmentsByComponentId(element.getId(), instance);
      for (String line: lines) {
        height += TextUtils.getHeightNeededForText(line, font, fontSize, width);
        height += (leading - fontSize);
      }
    } else {
      String value = FormUtils.getFormDataByKey(element.getDataModelBindings().get("simpleBinding"), formData);
      float rectHeight = TextUtils.getHeightNeededForTextBox(value, font, fontSize, width, leading);
      PDRectangle rect = new PDRectangle(0, 0, width, rectHeight);
      height += rect.getHeight();
    }
    return height;
  }
}
