package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;

import java.util.List;

@ApiModel(description = "Pages settings")
public class PagesSettings {
  List<String> order;

  public List<String> getOrder() { return order; }

  public void setOrder(List<String> order) { this.order = order; }
}
