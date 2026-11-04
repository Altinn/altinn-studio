using System.Text.Json;
using LocalTest.Services.LocalApp.Implementation;
using LocalTest.Services.TestData;
using LocalTest.Tests.Authorization;
using Xunit;

namespace LocalTest.Tests.TestData;

public sealed class AccessPackageTestDataTests : IDisposable
{
    private readonly string _root = Path.Join(Path.GetTempPath(), $"localtest-testdata-{Guid.NewGuid():N}");

    private static TestDataModel Read(string json = AccessPackageHarness.TestData) =>
        JsonSerializer.Deserialize<AppTestDataModel>(json, LocalAppHttp.JSON_OPTIONS)!.GetTestDataModel();

    [Fact]
    public void AppTestData_PackagesAreBareLowerCaseIdentifiers()
    {
        var authorization = Read().Authorization;

        Assert.Equal(["regnskapsforer-lonn", "lonn"], authorization.AccessPackages["1001"]["500000"]);
        Assert.Equal(["skattegrunnlag"], authorization.AccessPackages["1001"]["510001"]);
        Assert.Equal(["lonn"], authorization.SystemUsers[AccessPackageHarness.SystemUserWithPackage].AccessPackages);
    }

    [Fact]
    public void AppTestData_NullPackagesAreEmpty()
    {
        var authorization = Read(
            """
            {
              "persons": [
                { "partyId": 1, "ssn": "01017000001", "lastName": "A", "userId": 1, "accessPackages": { "500000": null } },
                { "partyId": 2, "ssn": "01017000002", "lastName": "B", "userId": 2, "accessPackages": { "500000": ["lonn", null, " "] } }
              ],
              "orgs": [],
              "systems": [{ "id": "s", "name": "S", "systemUsers": [{ "id": "su", "orgNumber": "1", "actions": [], "accessPackages": null }] }]
            }
            """
        ).Authorization;

        Assert.Empty(authorization.AccessPackages["1"]["500000"]);
        Assert.Equal(["lonn"], authorization.AccessPackages["2"]["500000"]);
        Assert.Empty(authorization.SystemUsers["su"].AccessPackages);
    }

    [Fact]
    public void AppTestData_UrnPrefixWithoutIdentifierIsNoPackage()
    {
        var authorization = Read(
            """
            {
              "persons": [
                {
                  "partyId": 1, "ssn": "01017000001", "lastName": "A", "userId": 1,
                  "accessPackages": { "500000": ["urn:altinn:accesspackage:", "URN:ALTINN:ACCESSPACKAGE: ", "urn:altinn:accesspackage: lonn"] }
                }
              ],
              "orgs": [],
              "systems": [{ "id": "s", "name": "S", "systemUsers": [{ "id": "su", "orgNumber": "1", "actions": [], "accessPackages": ["urn:altinn:accesspackage:"] }] }]
            }
            """
        ).Authorization;

        Assert.Equal(["lonn"], authorization.AccessPackages["1"]["500000"]);
        Assert.Empty(authorization.SystemUsers["su"].AccessPackages);
    }

    [Fact]
    public void AppTestData_PartiesWithOnlyPackagesAreInThePartyList()
    {
        var partyList = Read().Authorization.PartyList["1001"];

        Assert.Equal([510001, 500000], partyList.Select(p => p.PartyId));
        Assert.Equal(500001, Assert.Single(partyList[1].ChildParties).PartyId);
    }

    [Fact]
    public void Merge_AddsPackagesAndSystemUsersOfNewUsers()
    {
        var source = Read();
        var target = new TestDataModel();

        TestDataMerger.MergeTestData(source, target);

        Assert.Equal(["regnskapsforer-lonn", "lonn"], target.Authorization.AccessPackages["1001"]["500000"]);
        Assert.Contains(AccessPackageHarness.SystemUserWithPackage, target.Authorization.SystemUsers.Keys);
        Assert.Contains("910000000_sbs", target.Authorization.Systems.Keys);
    }

    [Fact]
    public void Merge_KeepsThePackagesAlreadyInTheTarget()
    {
        var source = Read();
        var target = new TestDataModel();
        target.Authorization.AccessPackages["1001"] = new() { ["500000"] = ["skattegrunnlag"] };

        TestDataMerger.MergeTestData(source, target);

        Assert.Equal(["skattegrunnlag"], target.Authorization.AccessPackages["1001"]["500000"]);
    }

    [Fact]
    public void FromTestDataModel_RoundTripsPackages()
    {
        var model = Read();

        var roundTripped = AppTestDataModel.FromTestDataModel(model).GetTestDataModel().Authorization;

        Assert.Equal(model.Authorization.AccessPackages["1001"], roundTripped.AccessPackages["1001"]);
        Assert.Equal(["lonn"], roundTripped.SystemUsers[AccessPackageHarness.SystemUserWithPackage].AccessPackages);
    }

    [Fact]
    public async Task DiskTestData_ReadsPackagesNextToRolesAndOnSystemUsers()
    {
        var partyFolder = Path.Join(_root, "authorization", "roles", "User_1001", "party_500000");
        var packageOnlyFolder = Path.Join(_root, "authorization", "roles", "User_1001", "party_500600");
        var systemUsers = Path.Join(_root, "authorization", "systems", "sys", "systemusers");
        foreach (var folder in new[] { "authorization/claims", "authorization/partylist", "Profile/User", "Register/Org", "Register/Party", "Register/Person" })
        {
            Directory.CreateDirectory(Path.Join(_root, folder));
        }
        Directory.CreateDirectory(partyFolder);
        Directory.CreateDirectory(packageOnlyFolder);
        Directory.CreateDirectory(systemUsers);
        await File.WriteAllTextAsync(Path.Join(partyFolder, "roles.json"), """[{ "Type": "altinn", "value": "dagl" }]""");
        await File.WriteAllTextAsync(Path.Join(partyFolder, "accesspackages.json"), """["lonn", "urn:altinn:accesspackage:skattegrunnlag"]""");
        await File.WriteAllTextAsync(Path.Join(packageOnlyFolder, "accesspackages.json"), """["lonn"]""");
        await File.WriteAllTextAsync(Path.Join(_root, "authorization", "systems", "sys", "system.json"), """{ "Id": "sys", "Name": "Sys" }""");
        await File.WriteAllTextAsync(Path.Join(systemUsers, "1.json"), """{ "Id": "su-1", "OrgNumber": "1", "Actions": ["read"], "AccessPackages": ["LONN"] }""");
        await File.WriteAllTextAsync(Path.Join(systemUsers, "2.json"), """{ "Id": "su-2", "OrgNumber": "1", "Actions": ["read"] }""");

        var authorization = (await TestDataDiskReader.ReadFromDisk(_root)).Authorization;

        Assert.Equal(["lonn", "skattegrunnlag"], authorization.AccessPackages["1001"]["500000"]);
        Assert.Equal(["lonn"], authorization.AccessPackages["1001"]["500600"]);
        Assert.Equal(["500000"], authorization.Roles["1001"].Keys);
        Assert.Equal(["lonn"], authorization.SystemUsers["su-1"].AccessPackages);
        Assert.Empty(authorization.SystemUsers["su-2"].AccessPackages);
    }

    [Fact]
    public async Task BuiltInTestData_GivesPengelensPartnerAndTheSystemUserPackages()
    {
        var testData = Path.GetFullPath(
            Path.Join(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "testdata")
        );

        var authorization = (await TestDataDiskReader.ReadFromDisk(testData)).Authorization;

        string[] packages = ["regnskapsforer-med-signeringsrettighet", "lonn"];
        Assert.Equal(packages, authorization.AccessPackages["1001"]["500000"]);
        Assert.Equal(packages, authorization.SystemUsers["d111dbab-d619-4f15-bf29-58fe570a9ae6"].AccessPackages);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }
}
