using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Authorization.Interface.Models;

namespace LocalTest.Services.TestData;

/// <summary>
/// Simple model that directly matches the directory structure of the TestData folder
/// Currently this is used internally for backwards compatibility reasons
/// </summary>
public class TestDataModel
{
    public TestDataAuthorization Authorization { get; set; } = new();
    public TestDataProfile Profile { get; set; } = new();
    public TestDataRegister Register { get; set; } = new();

    /// <summary>The main unit of an organization that is a sub-unit.</summary>
    public int? GetParentPartyId(int partyId) => Register.OrgUnits.GetValueOrDefault(partyId.ToString())?.ParentPartyId;

    /// <summary>
    /// The main unit whose roles and access packages a sub-unit inherits, as Access Management's hierarchy gives them.
    /// A sub-unit of unit type ADOS (an administrative unit in the public sector) inherits nothing, as in the platform,
    /// where that inheritance is off unless a feature flag turns it on.
    /// </summary>
    public int? GetInheritedFromPartyId(int partyId) =>
        string.Equals(GetUnitType(partyId), AdministrativeUnitPublicSector, StringComparison.OrdinalIgnoreCase)
            ? null
            : GetParentPartyId(partyId);

    private const string AdministrativeUnitPublicSector = "ADOS";

    /// <summary>The unit type of an organization (such as <c>AS</c> or <c>BEDR</c>), if the test data has one.</summary>
    public string? GetUnitType(int partyId) => Register.OrgUnits.GetValueOrDefault(partyId.ToString())?.UnitType;

    /// <summary>The organization with the organization number, if the test data has its party.</summary>
    public TestDataOrgUnit? GetOrgUnit(string orgNumber) =>
        Register.OrgUnits.Values.FirstOrDefault(unit => unit.OrgNumber == orgNumber);
}

public class TestDataAuthorization
{
    public Dictionary<string, List<CustomClaim>> Claims { get; set; } = new();
    public Dictionary<string, List<Party>> PartyList { get; set; } = new();
    public Dictionary<string, Dictionary<string, List<Role>>> Roles { get; set; } = new();
    /// <summary>The access packages each user holds, by user id and then by the party id they are held for.</summary>
    public Dictionary<string, Dictionary<string, List<string>>> AccessPackages { get; set; } = new();
    public Dictionary<string, TestDataSystem> Systems { get; set; } = new();
    public Dictionary<string, TestDataSystemUser> SystemUsers { get; set; } = new();
}

public sealed record TestDataSystem(
    string Id,
    string Name,
    Dictionary<string, TestDataSystemUser> SystemUsers
);

public sealed record TestDataSystemUser(
    string Id,
    string SystemId,
    string OrgNumber,
    IEnumerable<string> Actions,
    // The access packages the system user holds for its own organization (OrgNumber)
    IReadOnlyList<string> AccessPackages
)
{
    /// <summary>Whether the other system user has the same values, comparing the lists by their contents.</summary>
    public bool HasTheSameValues(TestDataSystemUser other) =>
        Id == other.Id
        && SystemId == other.SystemId
        && OrgNumber == other.OrgNumber
        && Actions.SequenceEqual(other.Actions)
        && AccessPackages.SequenceEqual(other.AccessPackages);
}

public class TestDataProfile
{
    public Dictionary<string, UserProfile> User { get; set; } = new();
}

public class TestDataRegister
{
    public Dictionary<string, Organization> Org { get; set; } = new();
    public Dictionary<string, Party> Party { get; set; } = new();
    public Dictionary<string, Person> Person { get; set; } = new();
    /// <summary>
    /// The organizations by party id, with their main unit and unit type, so that the hierarchy does not depend on
    /// which persons can act for them.
    /// </summary>
    public Dictionary<string, TestDataOrgUnit> OrgUnits { get; set; } = new();
}

/// <summary>An organization's party, with its main unit if it is a sub-unit, and its unit type.</summary>
public sealed record TestDataOrgUnit(int PartyId, string OrgNumber, int? ParentPartyId, string? UnitType)
{
    /// <summary>
    /// The organizations among the parties and their child parties (sub-units), as the built-in test data on disk holds
    /// them. A unit type missing on the party is read from the organization.
    /// </summary>
    public static Dictionary<string, TestDataOrgUnit> FromParties(
        IEnumerable<Party> parties,
        IReadOnlyDictionary<string, Organization> orgs
    )
    {
        var units = new Dictionary<string, TestDataOrgUnit>();

        void Add(Party party, int? parentPartyId)
        {
            if (!string.IsNullOrEmpty(party.OrgNumber))
            {
                var unitType = !string.IsNullOrEmpty(party.UnitType)
                    ? party.UnitType
                    : orgs.GetValueOrDefault(party.OrgNumber)?.UnitType;
                var key = party.PartyId.ToString();
                units[key] = units.TryGetValue(key, out var known)
                    ? known with
                    {
                        ParentPartyId = known.ParentPartyId ?? parentPartyId,
                        UnitType = known.UnitType ?? unitType,
                    }
                    : new TestDataOrgUnit(party.PartyId, party.OrgNumber, parentPartyId, unitType);
            }

            foreach (var child in party.ChildParties ?? [])
            {
                Add(child, party.PartyId);
            }
        }

        foreach (var party in parties)
        {
            Add(party, parentPartyId: null);
        }

        return units;
    }
}
