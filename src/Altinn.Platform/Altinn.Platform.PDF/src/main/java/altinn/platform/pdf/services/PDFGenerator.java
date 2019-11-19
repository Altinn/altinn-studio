package altinn.platform.pdf.services;

import altinn.platform.pdf.models.*;
import altinn.platform.pdf.utils.FormDataUtils;
import altinn.platform.pdf.utils.InstanceUtils;
import altinn.platform.pdf.utils.LayoutUtils;
import altinn.platform.pdf.utils.TextUtils;

import org.apache.pdfbox.cos.COSDictionary;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
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

public class PDFGenerator {
  private PDDocument document;
  private PDAcroForm form;
  private float width;
  private float yPoint;
  private float xPoint;
  private float componentMargin = 25;
  private float textFieldMargin = 5;
  private float fontSize = 10;
  private float headerFontSize = 14;
  private float leading = 1.2f * fontSize;
  private float textBoxMargin = 5;
  private PDFont font;
  private PDFont fontBold;
  private TextResources textResources;
  private Instance instance;
  private Document formData;
  private FormLayout formLayout;
  private Party party;
  private Party userParty;
  private PDPage currentPage;
  private PDPageContentStream currentContent;
  private ByteArrayOutputStream output;

  /**
   * Constructor for the AltinnPDFGenerator object
   */
  public PDFGenerator(PdfContext pdfContext) {
    this.document = new PDDocument();
    this.form = new PDAcroForm(this.document);
    this.formLayout = pdfContext.getFormLayout();
    this.textResources = pdfContext.getTextResources();
    this.instance = pdfContext.getInstance();
    this.output = new ByteArrayOutputStream();
    this.party = pdfContext.getParty();
    this.userParty = pdfContext.getUserParty();
    try {
      this.formData = FormDataUtils.parseXml(pdfContext.getData());
    } catch (Exception e) {
      BasicLogger.log(Level.SEVERE, e.toString());
    }
  }

  /**
   * Generetes the pdf based on the pdf context
   * @return a byte array output stream containing the generated pdf
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
    String defaultAppearance = "/Helv 10 Tf 0 0 0 rg";
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

    // draws header
    renderHeader();

    // draws submitted by
    renderSubmittedBy();

    // Loop through all pdfLayout elements and draws them
    for (FormLayoutElement element : formLayout.getData().getLayout()) {
      if (element.getType().equals("Button")) {
        continue;
      }
      float elementHeight = LayoutUtils.getElementHeight(element, font, fontSize, width, leading, textFieldMargin, textResources, formData, instance);
      if ((yPoint - elementHeight) < (0 + margin)) {
        // the element would fall outside the page, we create new page and start from there
        createNewPage();
        yPoint = currentPage.getMediaBox().getHeight() - margin;
      }
      renderLayoutElement(element);
      yPoint -= componentMargin;
    }

    // saves and closes
    currentContent.close();
    document.save(output);
    document.close();
    return output;
  }


  private void renderLayoutElement(FormLayoutElement element) throws IOException {
    // Render title
    String titleKey = element.getTextResourceBindings().getTitle();
    if (titleKey != null && !titleKey.isEmpty()) {
      String title = TextUtils.getTextResourceByKey(titleKey, textResources);
      renderText(title, fontBold, fontSize);
    }

    // Render description
    String descriptionKey = element.getTextResourceBindings().getDescription();
    if (descriptionKey != null && !descriptionKey.isEmpty()) {
      String description = TextUtils.getTextResourceByKey(descriptionKey, textResources);
      renderText(description, font, fontSize);
    }

    String elementType = element.getType();
    // Render content
    if (elementType.equalsIgnoreCase("paragraph") || elementType.equals("header")) {
      // has no content, ignore
      return;
    }
    else if (elementType.equalsIgnoreCase("fileupload")) {
      // different view for file upload
      renderFileUploadContent(element);
    } else {
      // all other components rendered equally
      renderLayoutElementContent(element);
    }
  }

  private void renderHeader() throws IOException{
    currentContent.beginText();
    currentContent.newLineAtOffset(xPoint, yPoint);
    currentContent.setFont(fontBold, headerFontSize);
    currentContent.showText(instance.getOrg());
    yPoint -= leading;
    currentContent.endText();
    yPoint -= textFieldMargin;
  }

  private void renderSubmittedBy() throws IOException {
    if (party == null) {
      return;
    }
    currentContent.beginText();
    currentContent.newLineAtOffset(xPoint, yPoint);
    currentContent.setFont(font, fontSize);
    String submittedBy;
    if (party.equals(userParty) || userParty == null) {
      submittedBy = "Levert av " + party.getName();
    } else {
      submittedBy = "Levert av " + userParty.getName() + " på vegne av " + party.getName();
    }
    List<String> lines = TextUtils.splitTextToLines(submittedBy, font, fontSize, width);
    lines.add("Referansenummer: " + instance.getId());
    for(String line : lines) {
      currentContent.showText(line);
      currentContent.newLineAtOffset(0, -leading);
      yPoint -= leading;
    }
    currentContent.endText();
    yPoint -= componentMargin;

  }

  private void createNewPage() throws IOException {
    if (currentContent != null) {
      // if we have several pages, close the last
      currentContent.close();
    }
    currentPage = new PDPage(PDRectangle.A4);
    document.addPage((currentPage));
    currentContent= new PDPageContentStream(document, currentPage);
  }

  private void renderText(String text, PDFont font, float fontSize) throws IOException {
    currentContent.beginText();
    currentContent.newLineAtOffset(xPoint, yPoint);
    currentContent.setFont(font, fontSize);
    List<String> lines = TextUtils.splitTextToLines(text, font, fontSize, width);
    for(String line : lines) {
      currentContent.showText(line);
      currentContent.newLineAtOffset(0, -leading);
      yPoint -= leading;
    }
    currentContent.endText();
    yPoint -= textFieldMargin;
  }

  private void renderLayoutElementContent(FormLayoutElement element) throws IOException {
    PDTextField textField = new PDTextField(this.form);
    textField.setPartialName(element.getId());
    String defaultAppearance = "/Helv 10 Tf 0 0 0 rg";
    textField.setDefaultAppearance(defaultAppearance);
    textField.setReadOnly(true);
    this.form.getFields().add(textField);
    PDAnnotationWidget widget = textField.getWidgets().get(0);
    String value = FormDataUtils.getFormDataByKey(element.getDataModelBindings().getSimpleBinding(), this.formData);
    float rectHeight = TextUtils.getHeightNeededForTextBox(value, font, fontSize, width - 2*textFieldMargin, leading);
    yPoint -= rectHeight;
    PDRectangle rect = new PDRectangle(xPoint, yPoint, width, rectHeight);
    widget.setRectangle(rect);
    // Sets border color
    PDAppearanceCharacteristicsDictionary fieldAppearance
      = new PDAppearanceCharacteristicsDictionary(new COSDictionary());
    fieldAppearance.setBorderColour(new PDColor(new float[]{0.0f,0.0f,0.0f}, PDDeviceRGB.INSTANCE));
    widget.setAppearanceCharacteristics(fieldAppearance);

    // adds rect around widget and ands to page
    widget.setPage(currentPage);
    currentPage.getAnnotations().add(widget);
    if (TextUtils.splitTextToLines(value, font, fontSize, width - 2*textBoxMargin).size() > 1) {
      textField.setMultiline(true);
    }
    textField.setDoNotScroll(true);
    textField.setValue(value);
  }

  private void renderFileUploadContent(FormLayoutElement element) throws IOException {
    List<String> files = InstanceUtils.getAttachmentsByComponentId(element.getId(), this.instance);
    currentContent.setFont(font, fontSize);
    currentContent.beginText();
    float indent = 10;
    currentContent.newLineAtOffset(xPoint + indent, yPoint);
    for(String file: files) {
      currentContent.showText("- " + file);
      currentContent.newLineAtOffset(0, -leading);
      yPoint -= leading;
    }
    currentContent.endText();
  }
}


