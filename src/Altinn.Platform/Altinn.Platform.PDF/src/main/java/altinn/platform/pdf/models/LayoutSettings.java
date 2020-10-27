package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;

@ApiModel(description = "Layout settings")
public class LayoutSettings {
  private PagesSettings page;

  public PagesSettings getPage() { return page; }

  public void setPage(PagesSettings page) { this.page = page; }
}
