package altinn.platform.pdf.configuration;

import com.google.gson.annotations.SerializedName;

public class KvSetting {
  @SerializedName("ClientId")
  private String clientId;

  @SerializedName("TenantId")
  private String tenantId;

  @SerializedName("ClientSecret")
  private String clientSecret;

  @SerializedName("SecretUri")
  private String secretUri;

  public String getClientId() {
    return clientId;
  }

  public void setClientId(String clientId) {
    this.clientId = clientId;
  }

  public String getTenantId() {
    return tenantId;
  }

  public void setTenantId(String tenantId) {
    this.tenantId = tenantId;
  }

  public String getClientSecret() {
    return clientSecret;
  }

  public void setClientSecret(String clientSecret) {
    this.clientSecret = clientSecret;
  }

  public String getSecretUri() {
    return secretUri;
  }

  public void setSecretUri(String secretUri) {
    this.secretUri = secretUri;
  }
}
