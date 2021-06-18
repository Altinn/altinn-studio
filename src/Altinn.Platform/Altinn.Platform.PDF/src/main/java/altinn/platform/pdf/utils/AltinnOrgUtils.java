package altinn.platform.pdf.utils;

import altinn.platform.pdf.models.AltinnOrg;
import altinn.platform.pdf.models.AltinnOrgs;
import altinn.platform.pdf.services.BasicLogger;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.Timer;
import java.util.TimerTask;
import java.util.logging.Level;

public class AltinnOrgUtils {
  private static AltinnOrgs altinnOrgs;

  /**
   * Gets the org full name by their short name
   * @param shortName the short org name
   * @param language the language to fetch
   * @return the long org name
   */
  public static String getOrgFullNameByShortName(String shortName, String language) {
    if (altinnOrgs == null || altinnOrgs.getOrgs() == null) {
      return shortName;
    }

    AltinnOrg org = altinnOrgs.getOrgs().get(shortName);

    if (org == null) {
      return shortName;
    }

    return org.getName().get(language);
  }

  /**
   * Fetches the altinn orgs form our cdn
   */
  public static void fetchAltinnOrgs() {
    HttpURLConnection connection = null;
    try {
      URL url = new URL("https://altinncdn.no/orgs/altinn-orgs.json");
      connection = (HttpURLConnection) url.openConnection();
      connection.setRequestMethod("GET");
      try (BufferedReader in = new BufferedReader(new InputStreamReader(connection.getInputStream(), Charset.forName("UTF-8")))) {
          ObjectMapper mapper = new ObjectMapper();
          mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
          altinnOrgs = mapper.readValue(in, AltinnOrgs.class);
      }
    } catch (Exception e) {
      BasicLogger.log(Level.SEVERE, e.getMessage());
    } finally {
      if (connection != null) {
        connection.disconnect();
      }
    }
  }

  /*
    Inits hourly task to fetch altinn orgs
   */
  public static void initAltinnOrgsHarvesting() {
    Timer timer = new Timer();
    TimerTask hourlyTask = new TimerTask() {
      @Override
      public void run() {
        fetchAltinnOrgs();
      }
    };
    timer.schedule (hourlyTask, 0l, (long) 1000*60*60);
  }
}
