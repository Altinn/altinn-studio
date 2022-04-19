package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.*;
import io.micrometer.core.instrument.util.IOUtils;
import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.IOException;
import java.io.StringReader;
import java.util.*;

public class OptionUtilsTest extends TestCase {

  public OptionUtilsTest(String testName) {
    super(testName);
  }

  private Document formData;

  public static Test suite() {
    return new TestSuite(altinn.platform.pdf.utils.OptionUtilsTest.class);
  }

  public void testGetOptionsFromOptionSource() throws IOException, SAXException, ParserConfigurationException {
    // Arrange
    Document formData = readAndParseFormData();

    FormLayoutElement group = new FormLayoutElement();
    group.setCount(1);
    HashMap<String, String> dataModelBindings = new HashMap<>();
    dataModelBindings.put("group", "Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788");
    group.setDataModelBindings(dataModelBindings);

    OptionSource source = new OptionSource();
    source.setGroup("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788");
    source.setLabel("option.label");
    source.setValue("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[{0}].SkattemeldingEndringEtterFristPost-datadef-37130.value");

    TextResources resources = new TextResources();
    List<TextResourceElement> textResourceElements = new ArrayList<>();
    TextResourceElement element = new TextResourceElement();
    element.setId("option.label");
    element.setValue("Value from group: {0}, the other value: {1}");
    List<TextResourceVariableElement> variableElements = new ArrayList<>();
    TextResourceVariableElement variable1 = new TextResourceVariableElement();
    variable1.setDataSource("dataModel");
    variable1.setKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[{0}].SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131.value");
    variableElements.add(variable1);
    TextResourceVariableElement variable2 = new TextResourceVariableElement();
    variable2.setDataSource("dataModel");
    variable2.setKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[{0}].SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value");
    variableElements.add(variable2);
    element.setVariables(variableElements);
    textResourceElements.add(element);
    resources.setResources(textResourceElements);

    // Act
    List<Option> result = OptionUtils.getOptionsFromOptionSource(source, group, formData, resources);

    // Assert
    assertEquals("Group1", result.get(0).getValue());
    assertEquals("Value from group: 1, the other value: 10", result.get(0).getLabel());

    assertEquals("Group2", result.get(1).getValue());
    assertEquals("Value from group: 2, the other value: 20", result.get(1).getLabel());

  }


  private Document readAndParseFormData() throws ParserConfigurationException, IOException, SAXException {
    if (this.formData != null) {
      return formData;
    }
    String xmlAsString = IOUtils.toString(this.getClass().getResourceAsStream("/formData/repeatingGroupFormData.xml"));
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
    factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    DocumentBuilder builder = factory.newDocumentBuilder();
    formData = builder.parse(new InputSource(new StringReader(xmlAsString)));
    return formData;
  }


}
