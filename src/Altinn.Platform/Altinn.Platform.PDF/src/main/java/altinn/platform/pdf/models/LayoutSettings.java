package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "Layout settings")
@Getter
@Setter
public class LayoutSettings {
  private PagesSettings pages;
  private ComponentSettings components;
}
