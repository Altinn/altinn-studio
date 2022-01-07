package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The profile")
public class UserProfile {
  private ProfileSettingPreference profileSettingPreference;

  public ProfileSettingPreference getProfileSettingPreference() {
    return profileSettingPreference;
  }

  public void setProfileSettingPreference(ProfileSettingPreference profileSettingPreference) {
    this.profileSettingPreference = profileSettingPreference;
  }
}
