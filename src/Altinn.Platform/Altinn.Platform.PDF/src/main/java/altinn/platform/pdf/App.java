package altinn.platform.pdf;

import altinn.platform.pdf.utils.AltinnOrgUtils;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class App {
  public static void main(String[] args) {
    AltinnOrgUtils.fetchAltinnOrgs();
    ConnectToKeyVaultAndSetApplicationInsight();
    SpringApplication.run(App.class, args);
  }

  private static void ConnectToKeyVaultAndSetApplicationInsight() {

  }
}
