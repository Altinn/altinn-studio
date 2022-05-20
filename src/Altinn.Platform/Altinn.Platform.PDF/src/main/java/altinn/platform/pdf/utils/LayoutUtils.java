package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.w3c.dom.Document;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

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
  public static float getElementHeight(FormLayoutElement element, PDType0Font font, float fontSize, float width, float leading, float textMargin, TextResources textResources, Document formData, Instance instance) throws IOException {
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

    if (element.getType().equalsIgnoreCase("paragraph") || element.getType().equalsIgnoreCase("header")) {
      // have no content, return height
      return height;
    }

    if (element.getType().equalsIgnoreCase("fileupload")) {
      List<String> lines = InstanceUtils.getAttachmentsByComponentId(element.getId(), instance);
      for (String line: lines) {
        height += TextUtils.getHeightNeededForText(line, font, fontSize, width);
        height += (leading - fontSize);
      }
    } else if (element.getType().equalsIgnoreCase("fileuploadwithtag")) {
      Map<String, List<String>> attachmentsAndTags = InstanceUtils.getAttachmentsAndTagsByComponentId(element.getId(), instance);
      for (String name: attachmentsAndTags.keySet()) {
        String line = name + " - ";
        List<String> tags = attachmentsAndTags.get(name);

        for (String tag: tags){
          if (tag != tags.get(tags.size() -1))
            line += tag + ", ";
          else
            line += tag;
        }
        height += TextUtils.getHeightNeededForText(line, font, fontSize, width);
        height += (leading - fontSize);
      }
    } else if (element.getType().equalsIgnoreCase("attachmentlist")) {
      List<String> lines = new ArrayList<>();
      for (String id: element.getDataTypeIds()) {
        lines.addAll(InstanceUtils.getAttachmentsByComponentId(id, instance));
      }

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

  /**
   * Check if page should be included in the pdf
   * @param layoutKey key the page
   * @param layoutSettings layoutSettings for the document
   * @param formLayoutElements list of formLayoutElements
   * @return boolean
   */
  public static boolean includePageInPdf(String layoutKey, LayoutSettings layoutSettings, List<FormLayoutElement> formLayoutElements) {
    return (layoutSettings == null || layoutSettings.getPages() == null ||
      layoutSettings.getPages().getExcludeFromPdf() == null ||
      !layoutSettings.getPages().getExcludeFromPdf().contains(layoutKey)) && checkVisibleFieldInPage(layoutSettings, formLayoutElements) ;
  }

  /**
   * Check if component should be included in the pdf
   * @param componentId id for the component
   * @param layoutSettings layoutSettings for the document
   * @return boolean
   */
  public static boolean includeComponentInPdf(String componentId, LayoutSettings layoutSettings) {
    return layoutSettings == null || layoutSettings.getComponents() == null ||
      layoutSettings.getComponents().getExcludeFromPdf() == null ||
      !layoutSettings.getComponents().getExcludeFromPdf().contains(componentId);
  }

  /**
   * Check if page has any visible components
   * @param layoutSettings layoutSettings for the document
   * @param formLayoutElements list of formLayoutElements
   * @return boolean
   */
  private static boolean checkVisibleFieldInPage(LayoutSettings layoutSettings, List<FormLayoutElement> formLayoutElements) {
    for(FormLayoutElement element : formLayoutElements) {
      String elementId = element.getId();
      if(includeComponentInPdf(elementId, layoutSettings)) {
        return true;
      }
    }
    return false;
  }
}
