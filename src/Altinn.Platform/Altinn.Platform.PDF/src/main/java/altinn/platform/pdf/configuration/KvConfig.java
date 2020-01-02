package altinn.platform.pdf.configuration;

public class KvConfig {
  public String ClientId;

  public String TenantId;

  public String ClientSecret;

  public String SecretUri;

  public String getClientId() {
    return ClientId;
  }

  public void setClientId(String clientId) {
    ClientId = clientId;
  }

  public String getTenantId() {
    return TenantId;
  }

  public void setTenantId(String tenantId) {
    TenantId = tenantId;
  }

  public String getClientSecret() {
    return ClientSecret;
  }

  public void setClientSecret(String clientSecret) {
    ClientSecret = clientSecret;
  }

  public String getSecretUri() {
    return SecretUri;
  }

  public void setSecretUri(String secretUri) {
    SecretUri = secretUri;
  }
}
