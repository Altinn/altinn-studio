package altinn.platform.pdf;

import altinn.platform.pdf.models.*;
import altinn.platform.pdf.services.BasicLogger;
import altinn.platform.pdf.utils.FormDataUtils;
import altinn.platform.pdf.utils.InstanceUtils;
import altinn.platform.pdf.utils.LayoutUtils;
import altinn.platform.pdf.utils.TextUtils;

import org.apache.pdfbox.cos.COSDictionary;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import org.apache.pdfbox.pdmodel.interactive.annotation.*;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.w3c.dom.Document;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Calendar;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

public class AltinnPDFGenerator {
  private PDDocument document;
  private PDAcroForm form;
  private float width;
  private float yPoint;
  private float xPoint;
  private float componentMargin = 25;
  private float textFieldMargin = 5;
  private float fontSize = 10;
  private float leading = 1.2f * fontSize;
  private PDFont font;
  private PDFont fontBold;
  private TextResources textResources;
  private Instance instance;
  private Document formData;
  private FormLayout formLayout;
  private PDPage currentPage;
  private PDPageContentStream currentContent;
  private ByteArrayOutputStream output;

  /**
   * Constructor for the AltinnPDFGenerator object
   */
  public AltinnPDFGenerator(PdfContext pdfContext) {
    this.document = new PDDocument();
    this.form = new PDAcroForm(this.document);
    this.formLayout = pdfContext.getFormLayout();
    this.textResources = pdfContext.getTextResources();
    this.instance = pdfContext.getInstance();
    this.output = new ByteArrayOutputStream();
    try {
      this.formData = FormDataUtils.parseXml(pdfContext.getData());
    } catch (Exception e) {
      BasicLogger.log(Level.SEVERE, e.toString());
    }
  }


  /**
   * Generates the PDF
   * @throws IOException
   */
  public ByteArrayOutputStream generatePDF() throws IOException {
    // General pdf setup
    PDDocumentInformation info = new PDDocumentInformation();
    info.setCreationDate(Calendar.getInstance());
    document.setDocumentInformation(info);
    PDResources resources = new PDResources();
    font = PDType1Font.HELVETICA;
    fontBold = PDType1Font.HELVETICA_BOLD;
    resources.put(COSName.getPDFName("Helv"), font);
    form.setDefaultResources(resources);
    String defaultAppearance = "/Helv 10 Tf 0 0 1 rg";
    form.setDefaultAppearance(defaultAppearance);
    document.getDocumentCatalog().setAcroForm(form);


    // creates a new page
    createNewPage();

    float pageWidth = currentPage.getMediaBox().getWidth();
    float pageHeight = currentPage.getMediaBox().getHeight();
    float margin = 50;
    this.width = pageWidth - 2* margin;

    // sets background color
    currentContent.setNonStrokingColor(Color.decode("#FFFFFF"));
    currentContent.addRect(0, 0, pageWidth, pageHeight);
    currentContent.fill();
    currentContent.setNonStrokingColor(Color.black);

    // init starting drawing points
    float headerMargin = 25;
    yPoint = pageHeight - headerMargin;
    xPoint = margin;

    yPoint = pageHeight - margin;
    drawHeader(currentContent);

    // Loop through all pdfLayout elements and draws them
    for (FormLayoutElement element : formLayout.getData().getLayout()) {
      float elementHeight = LayoutUtils.getElementHeight(element, font, fontSize, width, leading, textFieldMargin, textResources, formData, instance);
      if ((yPoint - elementHeight) < (0 + margin)) {
        // the element would fall outside the page, we create new page and start from there
        createNewPage();
        yPoint = currentPage.getMediaBox().getHeight() - margin;
      }
      drawLayoutElement(element, currentContent, currentPage);
      yPoint -= componentMargin;
    }

    // saves and closes
    currentContent.close();
    document.save(output);
    document.close();
    return output;
  }

  /**
   * Draws the layoutElement
   * @param element the element to be drawn
   * @param contents the content it should be written to
   * @param page the page is should be added to
   * @throws IOException
   */
  private void drawLayoutElement(FormLayoutElement element, PDPageContentStream contents, PDPage page) throws IOException {

    // Render label
    if (element.getTextResourceBindings().getTitle() != null && !element.getTextResourceBindings().getTitle().isEmpty()) {
      contents.beginText();
      contents.newLineAtOffset(xPoint, yPoint);
      contents.setFont(fontBold, fontSize);
      String title = TextUtils.getTextResourceByKey(element.getTextResourceBindings().getTitle(), this.textResources);
      List<String> lines = TextUtils.splitTextToLines(title, font, fontSize, width);
      for(String line : lines) {
        contents.showText(line);
        contents.newLineAtOffset(0, -leading);
        yPoint -= leading;
      }

      contents.endText();
      yPoint -= textFieldMargin;
    }

    // Render description
    if (element.getTextResourceBindings().getDescription() != null && !element.getTextResourceBindings().getDescription().isEmpty()) {
      contents.beginText();
      contents.setFont(font, fontSize);
      contents.newLineAtOffset(xPoint, yPoint);
      String description = TextUtils.getTextResourceByKey(element.getTextResourceBindings().getDescription(), this.textResources);
      List<String> lines = TextUtils.splitTextToLines(description, font, fontSize, width);
      for(String line: lines) {
        contents.showText(line);
        contents.newLineAtOffset(0, -leading);
        yPoint -= leading;
      }
      contents.endText();
      yPoint -= textFieldMargin;

    }

    if (element.getType().equalsIgnoreCase("fileupload")) {
      List<String> files = InstanceUtils.getAttachmentsByComponentId(element.getId(), this.instance);
      contents.setFont(font, fontSize);
      contents.beginText();
      float indent = 10;
      contents.newLineAtOffset(xPoint + indent, yPoint);
      for(String file: files) {
        contents.showText("- " + file);
        contents.newLineAtOffset(0, -leading);
        yPoint -= leading;
      }
      contents.endText();
    } else {
      PDTextField textField = new PDTextField(this.form);
      textField.setPartialName(element.getId());
      String defaultAppearance = "/Helv 10 Tf 0 0 0 rg";
      textField.setDefaultAppearance(defaultAppearance);
      textField.setReadOnly(true);

      this.form.getFields().add(textField);
      PDAnnotationWidget widget = textField.getWidgets().get(0);
      String value = FormDataUtils.getFormDataByKey(element.getDataModelBindings().getSimpleBinding(), this.formData);
      float rectHeight = TextUtils.getHeightNeededForTextBox(value, font, fontSize, width, leading);
      PDRectangle rect = new PDRectangle(xPoint, yPoint, width, rectHeight);
      float actualHeight = rect.getHeight();
      yPoint -= actualHeight;
      rect = new PDRectangle(xPoint, yPoint, width, rectHeight); // trick to get actual rect height
      widget.setRectangle(rect);
      // Sets border color
      PDAppearanceCharacteristicsDictionary fieldAppearance
        = new PDAppearanceCharacteristicsDictionary(new COSDictionary());
      fieldAppearance.setBorderColour(new PDColor(new float[]{0.0f,0.0f,0.0f}, PDDeviceRGB.INSTANCE));
      widget.setAppearanceCharacteristics(fieldAppearance);

      // adds rect around widget and ands to page
      widget.setPage(page);
      page.getAnnotations().add(widget);
      if (TextUtils.splitTextToLines(value, font, fontSize, width).size() > 1) {
        textField.setMultiline(true);
      }
      textField.setDoNotScroll(true);
      textField.setValue(value);
    }
  }

  private void drawHeader(PDPageContentStream contents) throws IOException{
    contents.beginText();
    contents.newLineAtOffset(xPoint, yPoint);
    float headerFontSize = 14;
    contents.setFont(fontBold, headerFontSize);
    contents.showText(instance.getOrg() + " - " + instance.getPresentationField().getNb());
    yPoint -= leading;
    contents.endText();
    yPoint -= componentMargin;
  }

  private void createNewPage() throws IOException {
    if (currentContent != null) {
      // if we have several pages, close the last one
      currentContent.close();
    }
    currentPage = new PDPage(PDRectangle.A4);
    document.addPage((currentPage));
    currentContent= new PDPageContentStream(document, currentPage);
  }
}
