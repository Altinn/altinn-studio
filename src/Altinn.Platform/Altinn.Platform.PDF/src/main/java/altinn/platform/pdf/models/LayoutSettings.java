package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;
import lombok.Getter;
import lombok.Setter;

@ApiModel(description = "Layout settings")
@Getter
@Setter
public class LayoutSettings {
  private PagesSettings pages;
  private ComponentSettings components;
}
