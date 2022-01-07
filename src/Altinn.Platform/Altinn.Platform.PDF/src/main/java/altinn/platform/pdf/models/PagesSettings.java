package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "Pages settings")
@Getter
@Setter
public class PagesSettings {
  private List<String> order;
  private List<String> excludeFromPdf;
}
