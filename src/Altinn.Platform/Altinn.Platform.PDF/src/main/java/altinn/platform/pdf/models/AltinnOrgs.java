package altinn.platform.pdf.models;

import java.util.HashMap;

public class AltinnOrgs {
  private HashMap<String, AltinnOrg> orgs;

  public HashMap<String, AltinnOrg> getOrgs() {
    return orgs;
  }

  public void setOrgs(HashMap<String, AltinnOrg> orgs) {
    this.orgs = orgs;
  }
}
