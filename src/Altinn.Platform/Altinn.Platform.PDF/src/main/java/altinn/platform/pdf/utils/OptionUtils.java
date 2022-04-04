package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.*;
import org.w3c.dom.Document;

import java.util.ArrayList;
import java.util.List;

public class OptionUtils {

  private OptionUtils() {}

  public static List<Option> getOptionsFromOptionSource(OptionSource source, FormLayoutElement group, Document data, TextResources resources) {
    List<Option> options = new ArrayList<>();
    TextResourceElement label =
      resources
        .getResources()
        .stream()
        .filter(e -> e.getId().equals(source.getLabel()))
        .findFirst()
        .orElseThrow();

    List<String> replaceValues = new ArrayList<>();

    for (int i = 0; i <= group.getCount(); i ++) {
      String dataBinding = source.getValue().replace("{0}", String.valueOf(i));
      String value = FormUtils.getFormDataByKey(dataBinding, data);

      for (TextResourceVariableElement variable : label.getVariables()) {
        if (variable.getDataSource().startsWith("dataModel")) {
          replaceValues.add(FormUtils.getFormDataByKey(variable.getKey().replace("{0}", String.valueOf(i)), data));
        }
      }
      String labelValue = TextUtils.replaceParameters(label.getValue(), replaceValues);

      Option option = new Option();
      option.setValue(value);
      option.setLabel(labelValue);
      options.add(option);

      replaceValues.clear();
    }

    return options;
  }


}
