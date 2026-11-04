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

    /// <summary>The main unit of an organization that is a sub-unit, as the party lists give it.</summary>
    public int? GetParentPartyId(int partyId) =>
        Authorization.PartyList.Values
            .SelectMany(parties => parties)
            .Concat(Register.Party.Values)
            .FirstOrDefault(party => party.ChildParties?.Any(child => child.PartyId == partyId) == true)
            ?.PartyId;

    /// <summary>The unit type of an organization (such as <c>AS</c> or <c>BEDR</c>), if the test data has one.</summary>
    public string? GetUnitType(int partyId)
    {
        if (!Register.Party.TryGetValue(partyId.ToString(), out var party))
        {
            return null;
        }

        if (!string.IsNullOrEmpty(party.UnitType))
        {
            return party.UnitType;
        }

        return party.OrgNumber is not null && Register.Org.TryGetValue(party.OrgNumber, out var org) ? org.UnitType : null;
    }
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
);

public class TestDataProfile
{
    public Dictionary<string, UserProfile> User { get; set; } = new();
}

public class TestDataRegister
{
    public Dictionary<string, Organization> Org { get; set; } = new();
    public Dictionary<string, Party> Party { get; set; } = new();
    public Dictionary<string, Person> Person { get; set; } = new();
}
