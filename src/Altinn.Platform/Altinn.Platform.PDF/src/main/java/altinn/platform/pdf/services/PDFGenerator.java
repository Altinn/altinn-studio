package altinn.platform.pdf.services;

import altinn.platform.pdf.models.*;
import altinn.platform.pdf.utils.*;

import com.microsoft.applicationinsights.core.dependencies.apachecommons.lang3.StringUtils;
import org.apache.pdfbox.cos.COSDictionary;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDNumberTreeNode;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.documentinterchange.logicalstructure.*;
import org.apache.pdfbox.pdmodel.documentinterchange.markedcontent.PDMarkedContent;
import org.apache.pdfbox.pdmodel.documentinterchange.markedcontent.PDPropertyList;
import org.apache.pdfbox.pdmodel.documentinterchange.taggedpdf.StandardStructureTypes;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageFitWidthDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDDocumentOutline;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDOutlineItem;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.viewerpreferences.PDViewerPreferences;
import org.w3c.dom.Document;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.List;
import java.util.Map;
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
  private float margin = 50;
  private PDFont font;
  private PDFont fontBold;
  private TextResources textResources;
  private Instance instance;
  private Document formData;
  private FormLayout originalFormLayout;
  private LayoutSettings layoutSettings;
  private Map<String, FormLayout> formLayouts;
  private Map<String, Map<String, String>> optionsDictionary;
  private List<FormLayoutElement> repeatingGroups;
  private Party party;
  private Party userParty;
  private UserProfile userProfile;
  private String language;
  private PDPage currentPage;
  private PDPageContentStream currentContent;
  private PDDocumentOutline outline;
  private PDOutlineItem pagesOutline;
  private ByteArrayOutputStream output;
  private COSDictionary currentMarkedContentDictionary;
  private int mcid = 1;
  private PDStructureElement currentPart;
  private PDStructureElement currentSection;


  /**
   * Constructor for the AltinnPDFGenerator object
   */
  public PDFGenerator(PdfContext pdfContext) {
    this.document = new PDDocument();
    this.form = new PDAcroForm(this.document);
    this.outline = new PDDocumentOutline();
    this.pagesOutline = new PDOutlineItem();
    this.originalFormLayout = pdfContext.getFormLayout();
    this.formLayouts = pdfContext.getFormLayouts();
    this.optionsDictionary = pdfContext.getOptionsDictionary();
    this.textResources = pdfContext.getTextResources();
    this.instance = pdfContext.getInstance();
    this.output = new ByteArrayOutputStream();
    this.party = pdfContext.getParty();
    this.userParty = pdfContext.getUserParty();
    this.language = pdfContext.getLanguage();
    this.userProfile = pdfContext.getUserProfile();
    this.layoutSettings = pdfContext.getLayoutSettings();
    try {
      this.formData = FormUtils.parseXml(pdfContext.getData());
      this.textResources.setResources(parseAndCleanTextResources(this.textResources.getResources(), this.formData));
    } catch (Exception e) {
      BasicLogger.log(Level.SEVERE, e.toString());
    }
  }

  /**
   * Generates the pdf based on the pdf context
   *
   * @return a byte array output stream containing the generated pdf
   * @throws IOException
   */
  public ByteArrayOutputStream generatePDF() throws IOException {
    // General pdf setup
    PDDocumentInformation info = new PDDocumentInformation();
    info.setCreationDate(Calendar.getInstance());
    info.setTitle(InstanceUtils.getInstanceName(instance));
    document.setDocumentInformation(info);
    pagesOutline.setTitle(getLanguageString("all_pages"));
    outline.addLast(pagesOutline);
    PDDocumentCatalog catalog = document.getDocumentCatalog();
    catalog.setDocumentOutline((outline));
    PDResources resources = new PDResources();
    font = PDType1Font.HELVETICA;
    fontBold = PDType1Font.HELVETICA_BOLD;
    resources.put(COSName.getPDFName("Helv"), font);
    form.setDefaultResources(resources);
    String defaultAppearance = "/Helv 10 Tf 0 0 0 rg";
    form.setDefaultAppearance(defaultAppearance);
    catalog.setAcroForm(form);
    catalog.setLanguage(getLanguage());
    catalog.setMarkInfo(new PDMarkInfo());
    catalog.getMarkInfo().setMarked(true);
    catalog.setViewerPreferences(new PDViewerPreferences(new COSDictionary()));
    catalog.getViewerPreferences().setDisplayDocTitle(true);
    catalog.setStructureTreeRoot(new PDStructureTreeRoot());
    catalog.getStructureTreeRoot().setParentTree(new PDNumberTreeNode(PDParentTreeValue.class));

    // creates a new page
    createNewPage();
    float pageWidth = currentPage.getMediaBox().getWidth();
    float pageHeight = currentPage.getMediaBox().getHeight();
    this.width = pageWidth - 2 * margin;

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

    boolean firstPage = true;
    // Loop through all pdfLayout elements and draws them
    if (originalFormLayout != null) {
      // Older versions of our PlatformService nuget package we supplied only one form layout. Have to be backwards compatible here.
      this.repeatingGroups = FormUtils.setupRepeatingGroups(this.originalFormLayout.getData().getLayout(), this.formData);
      List<FormLayoutElement> filteredLayout = FormUtils.getFilteredLayout(this.originalFormLayout.getData().getLayout());
      renderFormLayout(filteredLayout);
    } else if (formLayouts != null) {
      // contains a map of form layouts. Render each page and separate by a new page
      if (layoutSettings != null && layoutSettings.getPages() != null && layoutSettings.getPages().getOrder() != null && layoutSettings.getPages().getOrder().size() > 0) {
        // The app developer has specified the order on a page => render pages in accordance
        List<String> order = layoutSettings.getPages().getOrder();
        for (String layoutKey : order) {
          FormLayout layout = formLayouts.get(layoutKey);
          firstPage = checkLayoutAndRenderPage(firstPage, layoutKey, layout);
        }
      } else {
        for (Map.Entry<String, FormLayout> formLayoutKeyValuePair : formLayouts.entrySet()) {
          String layoutKey = formLayoutKeyValuePair.getKey();
          FormLayout layout = formLayoutKeyValuePair.getValue();
          firstPage = checkLayoutAndRenderPage(firstPage, layoutKey, layout);
        }
      }
    }

    // close document and save
    currentContent.close();
    document.getDocumentCatalog().getMarkInfo().setMarked(true);
    document.save(output);
    document.close();
    return output;
  }

  private boolean checkLayoutAndRenderPage(boolean firstPage, String layoutKey, FormLayout layout) throws IOException {
    if (LayoutUtils.includePageInPdf(layoutKey, layoutSettings, layout.getData().getLayout())) {
      if (!firstPage) {
        createNewPage();
        yPoint = currentPage.getMediaBox().getHeight() - margin;
      }

      originalFormLayout = layout;
      this.repeatingGroups = FormUtils.setupRepeatingGroups(this.originalFormLayout.getData().getLayout(), this.formData);
      List<FormLayoutElement> filteredLayout = FormUtils.getFilteredLayout(layout.getData().getLayout());
      renderFormLayout(filteredLayout);
      firstPage = false;
    }
    return firstPage;
  }

  private void renderFormLayout(List<FormLayoutElement> formLayout) throws IOException {
    for (FormLayoutElement element : formLayout) {
      String componentType = element.getType();
      if (componentType.equalsIgnoreCase("group")) {
        renderGroup(element, false);
      } else {
        renderLayoutElement(element);
      }
    }
  }

  private void renderGroup(FormLayoutElement element, boolean childGroup) throws IOException {
    String componentId = element.getId();
    if (!LayoutUtils.includeComponentInPdf(componentId, layoutSettings)) {
      return;
    }
    String groupBinding = element.getDataModelBindings().get("group");
    for (int groupIndex = 0; groupIndex < element.getCount(); groupIndex++) {
      for (String childId : element.getChildren()) {
        FormLayoutElement childElement = originalFormLayout.getData().getLayout().stream().filter(formLayoutElement -> formLayoutElement.getId().equals(childId)).findFirst().orElse(null);
        HashMap<String, String> originalDataModelBindings = new HashMap<>();
        if (childElement != null && childElement.getDataModelBindings() != null) {
          childElement.getDataModelBindings().entrySet().forEach(stringStringEntry -> originalDataModelBindings.put(stringStringEntry.getKey(), stringStringEntry.getValue()));
        }

        if (childElement != null && childElement.getType().equalsIgnoreCase("group")) {
          int finalGroupIndex = groupIndex;
          childElement = repeatingGroups.stream().filter(formLayoutElement -> formLayoutElement.getId().equals(childId + "-" + finalGroupIndex)).findFirst().orElse(null);
        }

        if (childElement == null) {
          continue;
        }
        if (childElement.getDataModelBindings() != null && !childElement.getType().equalsIgnoreCase("group")) {
          Map<String, String> dataBindings = childElement.getDataModelBindings();
          for (Map.Entry<String, String> dataBinding : dataBindings.entrySet()) {
            String currentBinding = dataBinding.getValue();
            if (childGroup) {
              int indexStart = groupBinding.indexOf("[");
              int indexEnd = groupBinding.indexOf("]");
              String nonIndexedGroupBinding = groupBinding.replace(groupBinding.substring(indexStart, indexEnd + 1), "");
              currentBinding = currentBinding.replace(nonIndexedGroupBinding, groupBinding);
            }
            String replacedBinding = currentBinding.replace(groupBinding, groupBinding + '[' + groupIndex + ']');
            dataBinding.setValue(replacedBinding);
          }
        }
        if (childElement.getType().equalsIgnoreCase("group")) {
          renderGroup(childElement, true);
        } else {
          if (LayoutUtils.includeComponentInPdf(childElement.getId() + "-" + groupIndex, layoutSettings)) {
            renderLayoutElement(childElement);
          }
          childElement.setDataModelBindings(originalDataModelBindings);
        }
      }
    }
  }

  private void renderLayoutElement(FormLayoutElement element) throws IOException {
    String componentType = element.getType();
    String componentId = element.getId();
    if (componentType.equals("Button")
      || componentType.equalsIgnoreCase("NavigationButtons")
      || !LayoutUtils.includeComponentInPdf(componentId, layoutSettings)) {
      return;
    }
    // Render title
    float elementHeight = LayoutUtils.getElementHeight(element, font, fontSize, width, leading, textFieldMargin, textResources, formData, instance);
    if ((yPoint - elementHeight) < (0 + margin)) {
      // the element would fall outside the page, we create new page and start from there
      createNewPage();
      yPoint = currentPage.getMediaBox().getHeight() - margin;
    }
    addPart();

    String titleKey = element.getTextResourceBindings().getTitle();
    if (titleKey != null && !titleKey.isEmpty()) {
      String title = TextUtils.getTextResourceByKey(titleKey, textResources);
      renderText(title, fontBold, fontSize, StandardStructureTypes.H2);
    }

    // Render description
    String descriptionKey = element.getTextResourceBindings().getDescription();
    if (descriptionKey != null && !descriptionKey.isEmpty()) {
      String description = TextUtils.getTextResourceByKey(descriptionKey, textResources);
      renderText(description, font, fontSize, StandardStructureTypes.P);
    }
    String elementType = element.getType();
    // Render content
    if (elementType.equalsIgnoreCase("paragraph") || elementType.equalsIgnoreCase("header")) {
      // has no content, ignore
      return;
    }

    if (elementType.equalsIgnoreCase("fileupload")) {
      // different view for file upload
      renderFileUploadContent(element);
    } else if (elementType.equalsIgnoreCase("attachmentlist")) {
      // different view for attachment list
      renderAttachmentListContent(element);
    } else if (elementType.equalsIgnoreCase("AddressComponent")) {
      renderAddressComponent(element);
    } else {
      // all other components rendered equally
      renderLayoutElementContent(element);
    }
    yPoint -= componentMargin;
  }

  private void renderHeader() throws IOException {
    addPart();
    addSection(currentPart);
    beginMarkedContent(COSName.P);
    addContentToCurrentSection(COSName.P, StandardStructureTypes.H1);
    currentContent.endMarkedContent();
    currentContent.beginText();
    currentContent.newLineAtOffset(xPoint, yPoint);
    currentContent.setFont(fontBold, headerFontSize);
    String unparsedHeader = AltinnOrgUtils.getOrgFullNameByShortName(instance.getOrg(), getLanguage()) + " - " + TextUtils.getTextResourceByKey("ServiceName", textResources);
    String header = TextUtils.removeIllegalChars(unparsedHeader);
    List<String> lines = TextUtils.splitTextToLines(header, fontBold, headerFontSize, width);
    for (String line : lines) {
      currentContent.showText(line);
      currentContent.newLineAtOffset(0, -leading);
      yPoint -= leading;
    }
    currentContent.endText();
    yPoint -= textFieldMargin;
    addContentToCurrentSection(COSName.P, StandardStructureTypes.H1);
    currentContent.endMarkedContent();
  }

  private void renderSubmittedBy() throws IOException {
    if (party == null) {
      return;
    }
    beginMarkedContent(COSName.P);
    addSection(currentPart);
    currentContent.beginText();
    currentContent.newLineAtOffset(xPoint, yPoint);
    currentContent.setFont(font, fontSize);
    String submittedBy;
    if (party.equals(userParty) || userParty == null) {
      submittedBy = getLanguageString("delivered_by") + " " + party.getName();
    } else {
      submittedBy =
        getLanguageString("delivered_by") + " " + userParty.getName() + " " + getLanguageString("on_behalf_of") + " " + party.getName();
    }
    List<String> lines = TextUtils.splitTextToLines(submittedBy, font, fontSize, width);
    lines.add(getLanguageString("reference_number") + " " + TextUtils.getInstanceGuid(instance.getId()).split("-")[4]);
    for (String line : lines) {
      currentContent.showText(line);
      currentContent.newLineAtOffset(0, -leading);
      yPoint -= leading;
    }
    currentContent.endText();
    addContentToCurrentSection(COSName.P, StandardStructureTypes.P);
    currentContent.endMarkedContent();
    yPoint -= componentMargin;
  }

  private void createNewPage() throws IOException {
    if (currentContent != null) {
      // if we have several pages, close the last
      currentContent.close();
    }
    currentPage = new PDPage(PDRectangle.A4);
    document.addPage((currentPage));
    // adds page to bookmarks
    PDPageDestination dest = new PDPageFitWidthDestination();
    dest.setPage(currentPage);
    PDOutlineItem bookmark = new PDOutlineItem();
    bookmark.setDestination(dest);
    bookmark.setTitle(getLanguageString("page") + " " + document.getPages().getCount());
    pagesOutline.addLast(bookmark);
    currentContent = new PDPageContentStream(document, currentPage);
  }

  private void renderText(String text, PDFont font, float fontSize, String type) throws IOException {
    addSection(currentPart);
    beginMarkedContent(COSName.P);
    addContentToCurrentSection(COSName.P, type);
    currentContent.beginText();
    currentContent.newLineAtOffset(xPoint, yPoint);
    currentContent.setFont(font, fontSize);
    List<String> lines = TextUtils.splitTextToLines(text, font, fontSize, width);
    for (String line : lines) {
      currentContent.showText(line);
      currentContent.newLineAtOffset(0, -leading);
      yPoint -= leading;
    }
    currentContent.endText();
    currentContent.endMarkedContent();
    yPoint -= textFieldMargin;
  }

  private void renderContent(String content) throws IOException {
    float rectHeight = TextUtils.getHeightNeededForTextBox(content, font, fontSize, width - 2 * textFieldMargin, leading);
    float fontHeight = TextUtils.getFontHeight(font, fontSize);
    renderBox(xPoint, yPoint + fontHeight + 2, width, rectHeight);
    renderText(content, font, fontSize, StandardStructureTypes.P);
    yPoint -= (rectHeight + fontHeight);
  }

  private void renderBox(float xStart, float yStart, float width, float height) throws IOException {
    renderLine(xStart, yStart, xStart + width, yStart);                                 // top
    renderLine(xStart, yStart - height, xStart + width, yStart - height);   // bottom
    renderLine(xStart, yStart, xStart, yStart - height);                                // left
    renderLine(xStart + width, yStart, xStart + width, yStart - height);     // right
  }

  private void renderLine(float xStart, float yStart, float xEnd, float yEnd) throws IOException {
    currentContent.moveTo(xStart, yStart);
    currentContent.lineTo(xEnd, yEnd);
    currentContent.stroke();
  }

  private void renderLayoutElementContent(FormLayoutElement element) throws IOException {

    String value;

    if (element.getOptionsId() != null || element.getOptions() != null) {
      value = getDisplayValueFromOptions(element);
    } else {
      value = FormUtils.getFormDataByKey(element.getDataModelBindings().get("simpleBinding"), formData);
    }

    if (element.getType().equalsIgnoreCase("Datepicker")) {
      renderContent(TextUtils.getDateFormat(value, getLanguage()));
    } else {
      renderContent(value);
    }
  }

  private String getDisplayValueFromOptions(FormLayoutElement element) {
    String value = FormUtils.getFormDataByKey(element.getDataModelBindings().get("simpleBinding"), formData);
    List<String> splitFormData;
    if (element.getType().equalsIgnoreCase("Checkboxes")) {
      // checkboxes can have multiple values, need to fetch label for each one
      splitFormData = Arrays.asList(value.split((",")));
    } else {
      // all other option components only have one selected value
      splitFormData = new ArrayList<>();
      splitFormData.add(value);
    }

    List<String> returnValues = new ArrayList<>();

    if (element.getOptionsId() != null) {
      if(optionsDictionary == null){
        return value;
      }
      splitFormData.forEach(formDataValue -> {
          String label = MapUtils.getLabelFromValue(optionsDictionary, element.getOptionsId(), formDataValue);
          returnValues.add(TextUtils.getTextResourceByKey(label, textResources));
        }
      );
    } else {
      List<Option> optionList = element.getOptions();
      splitFormData.forEach(formDataValue -> {
        var option = optionList.stream()
          .filter(o -> o.getValue().equals(formDataValue))
          .findFirst()
          .orElse(null);
        String label = (option != null) ? option.getLabel() : value;
        returnValues.add(TextUtils.getTextResourceByKey(label, textResources));
        }
      );

    }

    return String.join(", ", returnValues);
  }

  private void renderFileUploadContent(FormLayoutElement element) throws IOException {
    List<String> files = InstanceUtils.getAttachmentsByComponentId(element.getId(), this.instance);
    renderFileListContent(files);
  }

  private void renderAttachmentListContent(FormLayoutElement element) throws IOException {
    List<String> files = new ArrayList<>();
    for (String id : element.getDataTypeIds()) {
      files.addAll(InstanceUtils.getAttachmentsByComponentId(id, this.instance));
    }

    renderFileListContent(files);
  }

  private void renderFileListContent(List<String> files) throws IOException {
    addSection(currentPart);
    beginMarkedContent(COSName.P);
    currentContent.setFont(font, fontSize);
    currentContent.beginText();
    float indent = 10;
    currentContent.newLineAtOffset(xPoint + indent, yPoint);
    for (String file : files) {
      currentContent.showText("- " + file);
      currentContent.newLineAtOffset(0, -leading);
      yPoint -= leading;
    }
    currentContent.endText();
    addContentToCurrentSection(COSName.P, StandardStructureTypes.P);
    currentContent.endMarkedContent();
  }

  private void renderAddressComponent(FormLayoutElement element) throws IOException {
    renderText(getLanguageString("address"), font, fontSize, StandardStructureTypes.P);
    renderContent(FormUtils.getFormDataByKey(element.getDataModelBindings().get("address"), this.formData));
    yPoint -= componentMargin;

    renderText(getLanguageString("zip_code"), font, fontSize, StandardStructureTypes.P);
    renderContent(FormUtils.getFormDataByKey(element.getDataModelBindings().get("zipCode"), this.formData));
    yPoint -= componentMargin;

    renderText(getLanguageString("post_place"), font, fontSize, StandardStructureTypes.P);
    renderContent(FormUtils.getFormDataByKey(element.getDataModelBindings().get("postPlace"), this.formData));
    yPoint -= componentMargin;

    if (!element.isSimplified()) {
      renderText(getLanguageString("care_of"), font, fontSize, StandardStructureTypes.P);
      renderText(getLanguageString("house_number_helper"), font, fontSize, StandardStructureTypes.P);
      renderContent(FormUtils.getFormDataByKey(element.getDataModelBindings().get("careOf"), this.formData));
      yPoint -= componentMargin;

      renderText(getLanguageString("house_number"), font, fontSize, StandardStructureTypes.P);
      renderContent(FormUtils.getFormDataByKey(element.getDataModelBindings().get("houseNumber"), this.formData));
      yPoint -= componentMargin;
    }
  }

  private void addPart() {
    PDStructureElement part = new PDStructureElement(StandardStructureTypes.PART, document.getDocumentCatalog().getStructureTreeRoot());
    document.getDocumentCatalog().getStructureTreeRoot().appendKid(part);
    currentPart = part;
  }

  private void addSection(PDStructureElement parent) {
    PDStructureElement sect = new PDStructureElement(StandardStructureTypes.SECT, parent);
    parent.appendKid(sect);
    currentSection = sect;
  }

  private void addContentToCurrentSection(COSName name, String type) {
    PDStructureElement structureElement = new PDStructureElement(type, currentSection);
    structureElement.setPage(currentPage);
    PDMarkedContent markedContent = new PDMarkedContent(name, currentMarkedContentDictionary);
    structureElement.appendKid(markedContent);
    currentSection.appendKid(structureElement);
  }

  private void beginMarkedContent(COSName name) throws IOException {
    currentMarkedContentDictionary = new COSDictionary();
    currentMarkedContentDictionary.setInt(COSName.MCID, mcid);
    mcid++;
    currentContent.beginMarkedContent(name, PDPropertyList.create(currentMarkedContentDictionary));
  }

  private List<TextResourceElement> parseAndCleanTextResources(List<TextResourceElement> resources, Document formData) {
    List<String> replaceValues = new ArrayList<>();

    for (TextResourceElement res : resources) {
      res.setValue(TextUtils.removeIllegalChars(res.getValue()));
      replaceValues.clear();
      if (res.getVariables() != null) {
        for (TextResourceVariableElement variable : res.getVariables()) {
          if (variable.getDataSource().startsWith("dataModel")) {
            replaceValues.add(FormUtils.getFormDataByKey(variable.getKey(), formData));
          }
        }
        res.setValue(replaceParameters(res.getValue(), replaceValues));
      }
    }

    return resources;
  }

  private String replaceParameters(String nameString, List<String> params) {
    int index = 0;
    for (String param : params) {
      nameString = nameString.replace("{" + index + "}", param);
      index++;
    }

    return nameString;
  }

  private String getLanguageString(String key) {
    return TextUtils.getLanguageStringByKey(key, getLanguage());
  }

  private String getLanguage() {
    if (StringUtils.isNotEmpty(this.language)) {
      return this.language;
    } else {
      return (this.userProfile != null) ? this.userProfile.getProfileSettingPreference().getLanguage() : "nb";
    }
  }
}

