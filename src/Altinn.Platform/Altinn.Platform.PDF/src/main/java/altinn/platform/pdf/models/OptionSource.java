package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "Option source")
@Getter
@Setter
public class OptionSource {
  private String group;
  private String label;
  private String value;
}
