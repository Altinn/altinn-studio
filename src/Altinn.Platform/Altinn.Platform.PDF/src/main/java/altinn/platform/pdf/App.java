package altinn.platform.pdf;

import altinn.platform.pdf.configuration.AltinnDBSettingsSecret;
import altinn.platform.pdf.configuration.KvSetting;
import altinn.platform.pdf.services.BasicLogger;
import altinn.platform.pdf.utils.AltinnOrgUtils;
import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.azure.security.keyvault.secrets.SecretClient;
import com.azure.security.keyvault.secrets.SecretClientBuilder;
import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import com.microsoft.applicationinsights.TelemetryConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.logging.Level;

@SpringBootApplication
public class App {

  private static String vaultApplicationInsightsKey = "ApplicationInsights--InstrumentationKey--Pdf";

  public static void main(String[] args) {
    AltinnOrgUtils.fetchAltinnOrgs();
    try {
      connectToKeyVaultAndSetApplicationInsight();
    } catch (Exception e) {
      BasicLogger.log(Level.SEVERE, e.getMessage());
    }
    SpringApplication.run(App.class, args);
  }

  private static void connectToKeyVaultAndSetApplicationInsight() throws IOException {
    // Read kv-configuration
    Gson gson = new Gson();
    String rootFolderPath = new File("").getCanonicalFile().getParent();
    String configurationFilePath = rootFolderPath + File.separator + "altinn-appsettings" + File.separator + "altinn-dbsettings-secret.json";
    try (JsonReader jsonReader = new JsonReader(new FileReader(configurationFilePath))) {
      AltinnDBSettingsSecret altinnDBSettingsSecret = gson.fromJson(jsonReader, AltinnDBSettingsSecret.class);
      KvSetting kvSetting = altinnDBSettingsSecret.getKvSetting();

      ClientSecretCredential clientSecretCredential = new ClientSecretCredentialBuilder()
        .clientId(kvSetting.getClientId())
        .clientSecret(kvSetting.getClientSecret())
        .tenantId(kvSetting.getTenantId())
        .build();

      SecretClient secretClient = new SecretClientBuilder()
        .vaultUrl(kvSetting.getSecretUri())
        .credential(clientSecretCredential)
        .buildClient();

      String instrumentationKey = secretClient.getSecret(vaultApplicationInsightsKey).getValue();

      // Initializes app insights
      if (instrumentationKey != null) {
        TelemetryConfiguration.getActive().setInstrumentationKey(instrumentationKey);
        BasicLogger.log(Level.INFO, "Application insights instrumentation key has been set");
      } else {
        BasicLogger.log(Level.SEVERE, "Could not find application insights instrumentation key");
      }
    }
  }
}
