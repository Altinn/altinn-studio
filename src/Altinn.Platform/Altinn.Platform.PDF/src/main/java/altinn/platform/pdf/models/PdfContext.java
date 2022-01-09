package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.lang.Nullable;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;

import java.util.Map;
import java.util.SortedMap;

@Schema(description = "The PDF context which the PDF is generated from.")
public class PdfContext {

  @Schema(description = "The text resources json file")
  @NotNull
  private TextResources textResources;

  @Schema(description = "The form layout json file")
  private FormLayout formLayout;

  @Schema(description = "A dictionary of form layouts.")
  @Nullable
  private SortedMap<String, FormLayout> formLayouts;

  @Schema(description = "The xml data file, note: must be base 64 encoded")
  @NotNull
  @NotEmpty
  private String data;

  @Schema(description = "The instance metadata json file")
  @NotNull
  private Instance instance;

  @Schema(description = "The party of the instance owner")
  @NotNull
  private Party party;

  @Schema(description = "The party party of the currently active user")
  @Nullable
  private Party userParty;

  @Schema(description = "The profile of the active user")
  @Nullable
  private UserProfile userProfile;

  @Schema(description = "The language to generate the pdf in. Two-letter ISO standard")
  private String language;

  @Schema(description = "The dictionary containing all option sets")
  @Nullable
  private Map<String, Map<String,String>> optionsDictionary;

  @Schema(description = "The layout settings")
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
