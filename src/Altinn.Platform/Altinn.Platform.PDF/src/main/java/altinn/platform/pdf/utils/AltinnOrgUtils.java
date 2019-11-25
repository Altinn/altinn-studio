package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.AltinnOrg;
import altinn.platform.pdf.models.AltinnOrgs;
import altinn.platform.pdf.services.BasicLogger;
import com.google.gson.Gson;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.logging.Level;

public class AltinnOrgUtils {
  private static AltinnOrgs altinnOrgs;

  /**
   * Gets the org full name by their short name
   * @param shortName the short org name
   * @return the long org name
   */
  public static String getOrgFullNameByShortName(String shortName) {
    if (altinnOrgs == null || altinnOrgs.getOrgs() == null) {
      return "";
    }

    AltinnOrg org = altinnOrgs.getOrgs().get(shortName);

    if (org == null) {
      return "";
    }

    // TODO: Fetch language by user preference => post mvp
    return org.getName().get("nb");
  }

  /**
   * Fetches the altinn orgs form our cdn
   */
  public static void fetchAltinnOrgs() {
      try {
        URL url = new URL("https://altinncdn.no/orgs/altinn-orgs.json");
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod("GET");
        BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
        String inputLine;
        StringBuilder content = new StringBuilder();
        while ((inputLine = in.readLine()) != null) {
          content.append(inputLine);
        }
        in.close();
        Gson gson = new Gson();
        altinnOrgs = gson.fromJson(content.toString(), AltinnOrgs.class);
        con.disconnect();
      } catch (Exception e) {
        BasicLogger.log(Level.SEVERE, e.getMessage());
      }
    }

}
