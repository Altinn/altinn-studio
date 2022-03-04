package altinn.platform.pdf.models;

import java.util.HashMap;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "A form layout element")
@Getter
@Setter
public class FormLayoutElement {
  private String type;
  private String id;
  private HashMap<String, String> dataModelBindings;
  private TextResourceBindings textResourceBindings;
  private String optionsId;
  private List<Option> options;
  private boolean simplified;
  private List<String> children;
  private int count;
  private int maxCount;
  private List<String> dataTypeIds;
}
