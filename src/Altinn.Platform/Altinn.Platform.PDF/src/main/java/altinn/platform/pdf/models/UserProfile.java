package altinn.platform.pdf.models;

import io.swagger.annotations.ApiModel;

@ApiModel(description = "The profile")
public class Profile {
  private ProfileSettingPreference profileSettingPreference;

  public ProfileSettingPreference getProfileSettingPreference() {
    return profileSettingPreference;
  }

  public void setProfileSettingPreference(ProfileSettingPreference profileSettingPreference) {
    this.profileSettingPreference = profileSettingPreference;
  }
}
