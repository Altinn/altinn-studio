package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import org.springframework.lang.Nullable;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;

import java.util.Map;
import java.util.SortedMap;

@ApiModel(description = "The PDF context which the PDF is generated from.")
public class PdfContext {

  @ApiModelProperty(notes = "The text resources json file")
  @NotNull
  private TextResources textResources;

  @ApiModelProperty(notes = "The form layout json file")
  private FormLayout formLayout;

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

  @ApiModelProperty(notes = "The language to generate the pdf in. Two-letter ISO standard")
  private String language;

  @ApiModelProperty(notes = "The dictionary containing all option sets")
  @Nullable
  private Map<String, Map<String,String>> optionsDictionary;

  @ApiModelProperty(notes = "The layout settings")
  @Nullable
  private LayoutSettings layoutSettings;

  public Party getUserParty() { return userParty; }

  @Nullable
  public LayoutSettings getLayoutSettings() { return layoutSettings; }

  public void setLayoutSettings(@Nullable LayoutSettings layoutSettings) { this.layoutSettings = layoutSettings; }

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

  public String getLanguage() { return language; }

  public void setLanguage(String language) { this.language = language; }

  @Nullable
  public SortedMap<String, FormLayout> getFormLayouts() { return formLayouts; }

  public void setFormLayouts(@Nullable SortedMap<String, FormLayout> formLayouts) { this.formLayouts = formLayouts; }


  @Nullable
  public Map<String, Map<String,String>> getOptionsDictionary(){ return optionsDictionary; }

  public void setOptionsDictionary(@Nullable Map<String, Map<String,String>> optionsDictionary){

    this.optionsDictionary = optionsDictionary;
  }
}
