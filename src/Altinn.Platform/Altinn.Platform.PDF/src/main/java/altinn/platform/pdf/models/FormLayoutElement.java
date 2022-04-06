package altinn.platform.pdf.models;

import java.util.HashMap;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.apache.commons.lang3.SerializationUtils;

@Schema(description = "A form layout element")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class FormLayoutElement implements Cloneable{
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
  private GroupEditProperties edit;

  @Override
  public Object clone() {
  FormLayoutElement fle = null;
    try {
      fle = (FormLayoutElement) super.clone();
    } catch (CloneNotSupportedException e) {
      fle = new FormLayoutElement(
        this.type,
        this.id,
        this.dataModelBindings,
        this.textResourceBindings,
        this.optionsId,
        this.options,
        this.simplified,
        this.children,
        this.count,
        this.maxCount,
        this.dataTypeIds,
       this.edit);
    }

    fle.dataModelBindings = SerializationUtils.clone(dataModelBindings);
    return fle;
}
}

