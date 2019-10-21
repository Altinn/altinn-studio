package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.FormLayoutElement;
import altinn.platform.pdf.models.Instance;
import altinn.platform.pdf.models.TextResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.w3c.dom.Document;

import java.io.IOException;
import java.util.List;

public class LayoutUtils {

  /**
   * Gets the element height in pixels
   * @return the height in pixels
   */
  public static float getElementHeight(FormLayoutElement element, PDFont font, float fontSize, float width, float leading, float textMargin, TextResources textResources, Document formData, Instance instance) throws IOException {
    float height = 0;
    if (element.textResourceBindings.title != null && !element.textResourceBindings.title.isEmpty()) {
      String title = TextUtils.getTextResourceByKey(element.textResourceBindings.title, textResources);
      height += TextUtils.getHeightNeededForText(title, font, fontSize, width, leading);
      height += textMargin;
    }

    if (element.textResourceBindings.description != null && !element.textResourceBindings.description.isEmpty()) {
      String description = TextUtils.getTextResourceByKey(element.textResourceBindings.description, textResources);
      height += TextUtils.getHeightNeededForText(description, font, fontSize, width, leading);
      height += textMargin;
    }

    if (element.type.equalsIgnoreCase("fileupload")) {
      List<String> lines = InstanceUtils.getAttachmentsByComponentId(element.id, instance);
      for (String line: lines) {
        height += TextUtils.getHeightNeededForText(line, font, fontSize, width, leading);
        height += (leading - fontSize);
      }
    } else {
      String value = FormDataUtils.getFormDataByKey(element.dataModelBindings.simpleBinding, formData);
      float rectHeight = TextUtils.getHeightNeededForTextBox(value, font, fontSize, width, leading);
      PDRectangle rect = new PDRectangle(0, 0, width, rectHeight);
      height += rect.getHeight();
    }
    return height;
  }
}
