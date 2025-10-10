#nullable enable
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
}

public class TestDataAuthorization
{
    public Dictionary<string, List<CustomClaim>> Claims { get; set; } = new();
    public Dictionary<string, List<Party>> PartyList { get; set; } = new();
    public Dictionary<string, Dictionary<string, List<Role>>> Roles { get; set; } = new();
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
    IEnumerable<string> Actions
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
