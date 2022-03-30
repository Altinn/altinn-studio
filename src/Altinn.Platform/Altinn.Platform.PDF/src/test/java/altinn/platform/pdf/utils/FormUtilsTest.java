package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.FormLayout;
import altinn.platform.pdf.models.FormLayoutElement;
import com.google.gson.Gson;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FormUtilsTest extends TestCase {
  public FormUtilsTest(String testName) {
    super(testName);
  }

  private Document formData;

  public static Test suite() {
    return new TestSuite(altinn.platform.pdf.utils.FormUtilsTest.class);
  }

  public void test_getFilteredLayout_componentsPartOfGroupsShouldBeFilteredOut() {
    Gson gson = new Gson();
    FormLayout formLayout = gson.fromJson(IOUtils.toString(this.getClass().getResourceAsStream("/formLayout/formLayoutWithGroups.json")), FormLayout.class);
    List<FormLayoutElement> nonFilteredLayout = formLayout.getData().getLayout();
    List<FormLayoutElement> filteredLayout = FormUtils.getFilteredLayout(nonFilteredLayout);
    // We have six components which should be rendered as part of the groups
    assertEquals(filteredLayout.size(), nonFilteredLayout.size() - 6);
  }

  public void test_getFilteredLayout_componentsPartOfNestedGroupsShouldBeFilteredOut() {
    Gson gson = new Gson();
    FormLayout formLayout = gson.fromJson(IOUtils.toString(this.getClass().getResourceAsStream("/formLayout/formLayoutWithNestedGroups.json")), FormLayout.class);
    List<FormLayoutElement> nonFilteredLayout = formLayout.getData().getLayout();
    List<FormLayoutElement> filteredLayout = FormUtils.getFilteredLayout(nonFilteredLayout);
    // We have five components which should be rendered as part of the groups
    filteredLayout.forEach(e -> System.out.println(e.getId()));
    assertEquals(filteredLayout.size(), nonFilteredLayout.size() - 6);
  }

  public void test_getFilteredLayout_layoutWithNoGroupsIsUnchanged() {
    Gson gson = new Gson();
    FormLayout formLayout = gson.fromJson(IOUtils.toString(this.getClass().getResourceAsStream("/formLayout/formLayoutNoGroups.json")), FormLayout.class);
    List<FormLayoutElement> nonFilteredLayout = formLayout.getData().getLayout();
    List<FormLayoutElement> filteredLayout = FormUtils.getFilteredLayout(nonFilteredLayout);
    assertEquals(nonFilteredLayout.size(), filteredLayout.size());
  }

  public void test_setupRepeatingGroups_shouldReturnCorrectCount() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();
    Gson gson = new Gson();
    List<FormLayoutElement> formLayout = gson.fromJson(IOUtils.toString(this.getClass().getResourceAsStream("/formLayout/formLayoutWithGroups.json")), FormLayout.class)
      .getData()
      .getLayout();
    List<FormLayoutElement> groups = FormUtils.setupRepeatingGroups(formLayout, formData);
    assertEquals(3, groups.get(0).getCount());
    assertEquals(0, groups.get(1).getCount());
  }

  public void test_setupRepeatingGroups_shouldReturnCorrectCountForNestedGroups() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();
    Gson gson = new Gson();
    List<FormLayoutElement> formLayout = gson.fromJson(IOUtils.toString(this.getClass().getResourceAsStream("/formLayout/formLayoutWithNestedGroups.json")), FormLayout.class)
      .getData()
      .getLayout();
    List<FormLayoutElement> groups = FormUtils.setupRepeatingGroups(formLayout, formData);
    assertEquals(3, groups.get(0).getCount());
    assertEquals(3, groups.get(1).getCount());
    assertEquals(2, groups.get(2).getCount());
  }

  public void test_getGroupCount_shouldReturnCorrectCount() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();
    int count = FormUtils.getGroupCount("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788", formData);
    int nestedCount_1 = FormUtils.getGroupCount("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234", formData);
    int nestedCount_2 = FormUtils.getGroupCount("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[1].nested-grp-1234", formData);

    assertEquals(3, count);
    assertEquals(3, nestedCount_1);
    assertEquals(2, nestedCount_2);
  }

  public void test_getGroupCount_shouldReturnZeroForNonExistentGroup() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();
    int count = FormUtils.getGroupCount("Group.DoesNotExist", formData);
    int count2 = FormUtils.getGroupCount("GroupWithNoDots", formData);
    assertEquals(0, count);
    assertEquals(0, count2);
  }

  public void test_getFormDataByKey_shouldReturnCorrectValue() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();
    String result = FormUtils.getFormDataByKey("En-grp.Et-felt", formData);
    assertEquals("En verdi", result);
  }

  public void test_getFormDataByKey_shouldReturnCorrectValueForRepeatingGroup() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();

    String group1_frist = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].SkattemeldingEndringEtterFristPost-datadef-37130.value", formData);
    String group1_belop = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131.value", formData);
    String group1_nytt_belop = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value", formData);

    String group2_frist = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[1].SkattemeldingEndringEtterFristPost-datadef-37130.value", formData);
    String group2_belop = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[1].SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131.value", formData);
    String group2_nytt_belop = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[1].SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value", formData);

    String group3_frist = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[2].SkattemeldingEndringEtterFristPost-datadef-37130.value", formData);
    String group3_belop = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[2].SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131.value", formData);
    String group3_nytt_belop = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[2].SkattemeldingEndringEtterFristNyttBelop-datadef-37132.value", formData);

    assertEquals("Group1", group1_frist);
    assertEquals("1", group1_belop);
    assertEquals("10", group1_nytt_belop);

    assertEquals("Group2", group2_frist);
    assertEquals("2", group2_belop);
    assertEquals("20", group2_nytt_belop);

    assertEquals("Group3", group3_frist);
    assertEquals("3", group3_belop);
    assertEquals("30", group3_nytt_belop);
  }

  public void test_getFormDataByKey_shouldReturnCorrectValueForNestedRepeatingGroup() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();
    String nestedString_1 = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[0].NestedString", formData);
    String nestedInt_1 = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[0].NestedInt", formData);

    String nestedString_2 = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[1].NestedString", formData);
    String nestedInt_2 = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[1].NestedInt", formData);

    String nestedString_3 = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[2].NestedString", formData);
    String nestedInt_3 = FormUtils.getFormDataByKey("Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[0].nested-grp-1234[2].NestedInt", formData);

    assertEquals("string 1", nestedString_1);
    assertEquals("1", nestedInt_1);

    assertEquals("string 2", nestedString_2);
    assertEquals("2", nestedInt_2);

    assertEquals("string 3", nestedString_3);
    assertEquals("3", nestedInt_3);
  }

  public void test_getFormDataByKey_shouldReturnEmptyStringForNonExistentBinding() throws IOException, SAXException, ParserConfigurationException {
    Document formData = readAndParseFormData();
    String result = FormUtils.getFormDataByKey("Does.Not.Exist", formData);
    assertEquals("", result);
  }

  public void test_setGroupIndexForBinding() {

    Map<String, String[]> testData = new HashMap<>() {
      {
        // (String fullBinding, String groupBinding, int groupIndex) + expectedValued
        put("TC_1", new String[]{"owner.ownerOrganisationId", "owner", "0", "owner[0].ownerOrganisationId"});
        put("TC_2", new String[]{"owner", "owner", "0", "owner[0]"});
        put("TC_3", new String[]{"ownerName", "owner", "0", "ownerName"});
        put("TC_4", new String[]{"ownerName.ownerOrganisationId", "owner", "0", "ownerName.ownerOrganisationId"});
        put("TC_5", new String[]{"schema.owner.ownerOrganisationId", "owner", "1", "schema.owner[1].ownerOrganisationId"});
        put("TC_6", new String[]{"schema.owner", "owner", "1", "schema.owner[1]"});
        put("TC_7", new String[]{".ownerPet.dog", "owner", "0", ".ownerPet.dog"});
        put("TC_8", new String[]{"owner[1].faculty.owner", "owner", "0", "owner[1].faculty.owner[0]"});
      }
    };

    for (Map.Entry<String, String[]> entry : testData.entrySet()) {
      String key = entry.getKey();
      String[] value = entry.getValue();
      String actual = FormUtils.setGroupIndexForBinding(value[0], value[1], Integer.parseInt(value[2]));
      assertEquals(value[3], actual);
    }
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
