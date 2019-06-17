package altinn.platform.pdf;

import altinn.platform.pdf.models.*;
import altinn.platform.pdf.utils.FormDataUtils;
import altinn.platform.pdf.utils.TextUtils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import org.apache.pdfbox.cos.COSDictionary;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import org.apache.pdfbox.pdmodel.interactive.annotation.*;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDCheckBox;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.awt.*;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

public class AltinnPDFGenerator {
  private Gson gson;
  private PDDocument document;
  private PDAcroForm form;
  private float pageWidth;
  private float pageHeight;
  private float endOfComponentWidth;
  private float yPoint;
  private float xPoint;
  private TextResources textResources;
  private Document formData;

  /**
   * Constructor for the AltinnPDFGenerator object
   */
  public AltinnPDFGenerator() {
    this.document = new PDDocument();
    this.form = new PDAcroForm(this.document);
    this.gson = new GsonBuilder().setPrettyPrinting().create();
    try {
      this.textResources = this.readTextResources("resource.nn-NO.json");
      this.formData = this.readXML("C:\\Users\\sekeberg\\git\\altinn-studio\\src\\Altinn.Platform\\Altinn.Platform.PDF\\1183.xml");

    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  /**
   * Reads the specified formLayout.json and parses it to a java object
   * @param formLayoutPath the path for the formLayout.json to be read
   * @return an FormLayout java object
   * @throws IOException
   */
  private FormLayout readFormLayout(String formLayoutPath) throws IOException {
    FileReader fileReader = new FileReader(formLayoutPath);
    FormLayout formLayout = gson.fromJson(fileReader, FormLayout.class);
    fileReader.close();
    return formLayout;
  }

  /**
   * Reads the archived xml data file
   */
  public Document readXML(String xmlPath) throws ParserConfigurationException, IOException, SAXException {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    DocumentBuilder builder = factory.newDocumentBuilder();
    Document document = builder.parse(new File(xmlPath));
    return document;
  }


  /**
   * Reads the specified text resource json file and parses it to a java object
   * @param textResourcePath the path to the text resource file to be read
   * @return
   * @throws IOException
   */
  private TextResources readTextResources(String textResourcePath) throws IOException {
    FileReader fileReader = new FileReader(textResourcePath);
    TextResources textResources = gson.fromJson(fileReader, TextResources.class);
    fileReader.close();
    return textResources;
  }

  /**
   * Reads the specified pdfLayout.json and parses it to a java object
   * @param pdfLayoutPath
   * @return a PDFLayout java object
   * @throws IOException
   */
  public PDFLayout readPDFLayout(String pdfLayoutPath) throws IOException {
    FileReader fileReader = new FileReader(pdfLayoutPath);
    PDFLayout pdfLayout = gson.fromJson(fileReader, PDFLayout.class);
    fileReader.close();
    return pdfLayout;
  }

  /**
   * Generates a json structure used as a layout for PDF generation from the supplied formLayout.json
   * @param outputName the name of the outputted JSON structure
   * @param formLayoutPath the path of the formLayout.json the pdf layout should be based upon
   * @return the generated pdfLayout
   * @throws IOException
   */
  public PDFLayout generatePDFLayout(String outputName, String formLayoutPath) throws IOException {
    FileWriter fileWriter = new FileWriter(outputName);
    FormLayout formLayout = this.readFormLayout(formLayoutPath);
    PDFLayout pdfLayout = new PDFLayout();
    pdfLayout.backgroundColor = "#1eaef7";
    pdfLayout.modalColor = "#022f51";
    pdfLayout.spacingComponents = 100;
    for (FormLayoutElement element : formLayout.data.layout) {
      pdfLayout.elements.add(new PDFLayoutElement(
        element.type,
        element.id,
        element.dataModelBindings,
        element.textResourceBindings,
        element.options
      ));
    }

    gson.toJson(pdfLayout, fileWriter);
    fileWriter.flush();
    fileWriter.close();
    return pdfLayout;
  }

  /**
   * Generates the PDF based on the pdfLayout.json file supplied
   * @param pdfLayout the layout the pdf should be based on
   * @param outputName the name of the generated PDF
   * @throws IOException
   */
  public void generatePDF(PDFLayout pdfLayout, String outputName) throws IOException {
    PDPage page = new PDPage(PDRectangle.A4); // TODO: Make this configurable from pdfLayout.json?
    document.addPage((page));
    PDResources resources = new PDResources();
    PDFont font = PDType1Font.HELVETICA;
    resources.put(COSName.getPDFName("Helv"), font);
    form.setDefaultResources(resources);
    String defaultAppearance = "/Helv 12 Tf 0 0 1 rg";
    form.setDefaultAppearance(defaultAppearance);
    document.getDocumentCatalog().setAcroForm(form);
    PDPageContentStream contents = new PDPageContentStream(document, page);

    this.pageWidth = page.getMediaBox().getWidth();
    this.pageHeight = page.getMediaBox().getHeight();
    this.endOfComponentWidth = this.pageWidth - 250;

    // sets background color
    contents.setNonStrokingColor(Color.decode(pdfLayout.backgroundColor));
    contents.addRect(0, 0, pageWidth, pageHeight);
    contents.fill();

    // create "modal"
    contents.setNonStrokingColor(Color.white);
    contents.addRect(100, 50, pageWidth - 200, pageHeight - 100);
    contents.fill();

    // create "modal top"
    contents.setNonStrokingColor(Color.decode(pdfLayout.modalColor));
    contents.addRect(100, pageHeight - 125, pageWidth - 200, 75);
    contents.fill();

    contents.setNonStrokingColor(Color.black);

    xPoint = 125;
    yPoint = pageHeight - 150;
    // Loop through all pdfLayout elements and draws them
    for (PDFLayoutElement element : pdfLayout.elements) {
      drawLayoutElement(element, contents, page);
      yPoint -= pdfLayout.spacingComponents;
      // TODO: Create new page if needed
    }

    // saves and closes
    contents.close();
    document.save(outputName);
    document.close();
  }

  /**
   * Draws the layoutElement
   * @param element the elment to be drawn
   * @param contents the content it shoudl be written to
   * @param page the page is should be added to
   * @throws IOException
   */
  private void drawLayoutElement(PDFLayoutElement element, PDPageContentStream contents, PDPage page) throws IOException {

    // Render label
    // TODO: Break into multiple lines if needed
    if (element.textResourceBindings.title != null && !element.textResourceBindings.title.isEmpty()) {
      contents.beginText();
      PDFont font = PDType1Font.HELVETICA_BOLD;
      contents.setFont(font, 12);
      contents.newLineAtOffset(xPoint, yPoint);
      String title = TextUtils.getTextResourceByKey(element.textResourceBindings.title, this.textResources);
      contents.showText(title);
      contents.endText();
      yPoint -= 25;
    }

    // Render description
    // TODO: Break into multiple lines if needed
    if (element.textResourceBindings.description != null && !element.textResourceBindings.description.isEmpty()) {
      contents.beginText();
      PDFont font = PDType1Font.HELVETICA;
      contents.setFont(font, 12);
      contents.newLineAtOffset(xPoint, yPoint);
      String description = TextUtils.getTextResourceByKey(element.textResourceBindings.description, this.textResources);
      contents.showText(description);
      contents.endText();
      yPoint -= 25;
    }

    switch (element.type.toLowerCase()) {
      case "input":
        drawInputComponent(element, page);
        break;
      case "textfield":
        drawTextAreaComponent(element, page);
        break;
      case "checkboxes":
        drawCheckBoxComponent(element, contents, page);
        break;
    }
  }

  /**
   * Draws a input component
   * @param element the element
   * @param page the page to add component to
   * @throws IOException
   */
  private void drawInputComponent(PDFLayoutElement element, PDPage page) throws IOException {
    PDTextField textField = new PDTextField(this.form);
    textField.setPartialName(element.id);
    String defaultAppearance = "/Helv 12 Tf 0 0 0 rg";
    textField.setDefaultAppearance(defaultAppearance); // TODO: Make this part of pdfLayout.json?
    textField.setReadOnly(true);

    this.form.getFields().add(textField);
    PDAnnotationWidget widget = textField.getWidgets().get(0);
    yPoint -= 10;
    PDRectangle rect = new PDRectangle(xPoint, yPoint, endOfComponentWidth, 25);
    widget.setRectangle(rect);
    widget.setRectangle(rect);
    // Sets border color
    PDAppearanceCharacteristicsDictionary fieldAppearance
      = new PDAppearanceCharacteristicsDictionary(new COSDictionary());
    fieldAppearance.setBorderColour(new PDColor(new float[]{0.15f,0.54f,1}, PDDeviceRGB.INSTANCE));
    widget.setAppearanceCharacteristics(fieldAppearance);

    // adds rect around widget and ands to page
    widget.setPage(page);
    page.getAnnotations().add(widget);
    String value = FormDataUtils.getFormDataByKey(element.dataModelBindings.simpleBinding, this.formData);
    textField.setValue(value);
  }

  /**
   * Draws a text area component
   * @param element the element to draw
   * @param page the page to add component to
   * @throws IOException
   */
  private void drawTextAreaComponent(PDFLayoutElement element, PDPage page) throws IOException {
    PDTextField textField = new PDTextField(this.form);
    textField.setPartialName(element.id);
    String defaultAppearance = "/Helv 12 Tf 0 0 0 rg";
    textField.setDefaultAppearance(defaultAppearance); // TODO: Make this part of pdfLayout.json?
    textField.setReadOnly(true);
    textField.setMultiline(true);

    this.form.getFields().add(textField);
    PDAnnotationWidget widget = textField.getWidgets().get(0);
    yPoint -= 60;
    PDRectangle rect = new PDRectangle(xPoint, yPoint, endOfComponentWidth, 75);
    widget.setRectangle(rect);

    // Sets border color
    PDAppearanceCharacteristicsDictionary fieldAppearance
      = new PDAppearanceCharacteristicsDictionary(new COSDictionary());
    fieldAppearance.setBorderColour(new PDColor(new float[]{0.15f,0.54f,1}, PDDeviceRGB.INSTANCE));
    widget.setAppearanceCharacteristics(fieldAppearance);

    // Adds rect to widget and ands to page
    widget.setPage(page);
    page.getAnnotations().add(widget);
    String value = FormDataUtils.getFormDataByKey(element.dataModelBindings.simpleBinding, this.formData);
    textField.setValue(value);
  }

  /**
   * Draws a check box component
   * @param element the element to draw
   * @param page the page to add the component to
   */
  private void drawCheckBoxComponent(PDFLayoutElement element, PDPageContentStream contents, PDPage page) throws IOException {
    COSDictionary normalAppearances = new COSDictionary();
      PDAppearanceDictionary pdAppearanceDictionary = new PDAppearanceDictionary();
      pdAppearanceDictionary.setNormalAppearance(new PDAppearanceEntry(normalAppearances));
      pdAppearanceDictionary.setDownAppearance(new PDAppearanceEntry(normalAppearances));

      PDAppearanceStream pdAppearanceStream = new PDAppearanceStream(document);
      pdAppearanceStream.setResources(new PDResources());
      try (PDPageContentStream pdPageContentStream = new PDPageContentStream(document, pdAppearanceStream))
      {
        pdPageContentStream.setFont(PDType1Font.ZAPF_DINGBATS, 14.5f);
        pdPageContentStream.beginText();
        pdPageContentStream.newLineAtOffset(3, 4);
        pdPageContentStream.showText("\u2714");
        pdPageContentStream.endText();
      }
      pdAppearanceStream.setBBox(new PDRectangle(18, 18));
      normalAppearances.setItem("Yes", pdAppearanceStream);

      pdAppearanceStream = new PDAppearanceStream(document);
      pdAppearanceStream.setResources(new PDResources());
      try (PDPageContentStream pdPageContentStream = new PDPageContentStream(document, pdAppearanceStream))
      {
        pdPageContentStream.setFont(PDType1Font.ZAPF_DINGBATS, 14.5f);
        pdPageContentStream.beginText();
        pdPageContentStream.newLineAtOffset(3, 4);
        pdPageContentStream.showText("\u2718");
        pdPageContentStream.endText();
      }
      pdAppearanceStream.setBBox(new PDRectangle(18, 18));
      normalAppearances.setItem("Off", pdAppearanceStream);

      PDCheckBox checkBox = new PDCheckBox(this.form);
      this.form.getFields().add(checkBox);
      checkBox.setPartialName("CheckBoxField");
      checkBox.setFieldFlags(4);


      for (PDAnnotationWidget pdAnnotationWidget : checkBox.getWidgets())
      {
        pdAnnotationWidget.setRectangle(new PDRectangle(xPoint, yPoint, 18, 18));
        pdAnnotationWidget.setPage(page);
        page.getAnnotations().add(pdAnnotationWidget);
        pdAnnotationWidget.setAppearance(pdAppearanceDictionary);
        // Sets border color
        PDAppearanceCharacteristicsDictionary fieldAppearance
          = new PDAppearanceCharacteristicsDictionary(new COSDictionary());
        fieldAppearance.setBorderColour(new PDColor(new float[]{0.15f,0.54f,1}, PDDeviceRGB.INSTANCE));
        pdAnnotationWidget.setAppearanceCharacteristics(fieldAppearance);
      }
      checkBox.check();

      // draw label for check box
      contents.beginText();
      PDFont font = PDType1Font.HELVETICA;
      contents.setFont(font, 12);
      contents.newLineAtOffset(xPoint + 25, yPoint + 3);
      contents.showText(element.options[0].label);
      contents.endText();
  }
}
