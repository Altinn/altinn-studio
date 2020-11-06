package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;

@ApiModel(description = "Layout settings")
public class LayoutSettings {
  private PagesSettings pages;

  public PagesSettings getPages() { return pages; }

  public void setPages(PagesSettings pages) { this.pages = pages; }
}
