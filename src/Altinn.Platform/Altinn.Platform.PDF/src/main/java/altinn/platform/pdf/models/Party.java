package altinn.platform.pdf.models;

import io.swagger.v3.oas.annotations.media.Schema;

import javax.validation.constraints.NotNull;
import java.util.Objects;

@Schema(description = "An altinn party object")
public class Party {
  private Integer partyId;
  private Integer partyTypeName;
  private String orgNumber;
  private String ssn;
  private String unitType;
  @NotNull
  private String name;
  private Boolean isDeleted;
  private Boolean onlyHierarchyElementWithNoAccess;

  public Integer getPartyId() {return partyId; }

  public void setPartyId(Integer partyId) { this.partyId = partyId; }

  public Integer getPartyTypeName() { return partyTypeName; }

  public void setPartyTypeName(Integer partyTypeName) { this.partyTypeName = partyTypeName; }

  public String getOrgNumber() { return orgNumber; }

  public void setOrgNumber(String orgNumber) { this.orgNumber = orgNumber; }

  public String getSsn() { return ssn; }

  public void setSsn(String ssn) { this.ssn = ssn; }

  public String getUnitType() { return unitType; }

  public void setUnitType(String unitType) { this.unitType = unitType; }

  public String getName() { return name; }

  public void setName(String name) { this.name = name; }

  public Boolean getDeleted() { return isDeleted; }

  public void setDeleted(Boolean deleted) { isDeleted = deleted; }

  public Boolean getOnlyHierarchyElementWithNoAccess() { return onlyHierarchyElementWithNoAccess; }

  public void setOnlyHierarchyElementWithNoAccess(Boolean onlyHierarchyElementWithNoAccess) { this.onlyHierarchyElementWithNoAccess = onlyHierarchyElementWithNoAccess; }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (other == null) {
      return false;
    }
    if (getClass() != other.getClass()) {
      return false;
    }
    Party otherParty = (Party) other;
    return Objects.equals(this.ssn, otherParty.ssn) && Objects.equals(this.orgNumber, otherParty.orgNumber);
  }

  @Override
  public int hashCode() {
    return Objects.hash(partyId);
  }
}
