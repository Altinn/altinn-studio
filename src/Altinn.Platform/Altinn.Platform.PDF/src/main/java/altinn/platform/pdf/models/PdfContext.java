package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import org.springframework.lang.Nullable;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.SortedMap;

@ApiModel(description = "The PDF context which the PDF is generated from.")
public class PdfContext {

  @ApiModelProperty(notes = "The text resources json file")
  @NotNull
  private TextResources textResources;

  @ApiModelProperty(notes = "The form layout json file")
  private FormLayout formLayout;

  @Nullable
  public SortedMap<String, FormLayout> getFormLayouts() { return formLayouts; }

  public void setFormLayouts(@Nullable SortedMap<String, FormLayout> formLayouts) { this.formLayouts = formLayouts; }

  @ApiModelProperty(notes = "A dictionary of form layouts.")
  @Nullable
  private SortedMap<String, FormLayout> formLayouts;

  @ApiModelProperty(notes = "The xml data file, note: must be base 64 encoded")
  @NotNull
  @NotEmpty
  private String data;

  @ApiModelProperty(notes = "The instance metadata json file")
  @NotNull
  private Instance instance;

  @ApiModelProperty(notes = "The party of the instance owner")
  @NotNull
  private Party party;

  @ApiModelProperty(notes = "The party party of the currently active user")
  @Nullable
  private Party userParty;

  @ApiModelProperty(notes = "The profile of the active user")
  @Nullable
  private UserProfile userProfile;

  @Nullable
  public LayoutSettings getLayoutSettings() { return layoutSettings; }

  public void setLayoutSettings(@Nullable LayoutSettings layoutSettings) { this.layoutSettings = layoutSettings; }

  @ApiModelProperty(notes = "The layout settings")
  @Nullable
  private LayoutSettings layoutSettings;

  public Party getUserParty() { return userParty; }

  public void setUserParty(Party userParty) { this.userParty = userParty; }

  public Party getParty() { return party; }

  public void setParty(Party party) { this.party = party; }

  public TextResources getTextResources() { return textResources; }

  public void setTextResources(TextResources textResources) { this.textResources = textResources; }

  public FormLayout getFormLayout() { return formLayout; }

  public void setFormLayout(FormLayout formLayout) { this.formLayout = formLayout; }

  public String getData() { return data; }

  public void setData(String data) { this.data = data; }

  public Instance getInstance() { return instance; }

  public void setInstance(Instance instance) { this.instance = instance; }

  @Nullable
  public UserProfile getUserProfile() {
    return userProfile;
  }

  public void setUserProfile(@Nullable UserProfile userProfile) {
    this.userProfile = userProfile;
  }

}
