#nullable enable
using System.Text.Json;
using System.Text.Json.Serialization;
using Authorization.Interface.Models;

namespace LocalTest.Services.TestData;

public static class TestDataDiskReader
{
    private static JsonSerializerOptions _options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
    {
        Converters = {new JsonStringEnumConverter()}
    };

    public static async Task<TestDataModel> ReadFromDisk(string testDataPath)
    {
        var testData = new TestDataModel();
        await ReadFolderToDictionary(Path.Join(testDataPath, "authorization", "claims"), testData.Authorization.Claims);
        await ReadRoles(testDataPath, testData);
        await ReadFolderToDictionary(Path.Join(testDataPath, "authorization", "partylist"), testData.Authorization.PartyList);
        await ReadSystems(testDataPath, testData.Authorization);
        await ReadFolderToDictionary(Path.Join(testDataPath, "Profile", "User"), testData.Profile.User);
        await ReadFolderToDictionary(Path.Join(testDataPath, "Register", "Org"), testData.Register.Org);
        await ReadFolderToDictionary(Path.Join(testDataPath, "Register", "Party"), testData.Register.Party);
        await ReadFolderToDictionary(Path.Join(testDataPath, "Register", "Person"), testData.Register.Person);

        return testData;
    }

    private static async Task ReadSystems(string testDataPath, TestDataAuthorization testData)
    {
        var systemsFolder = new DirectoryInfo(Path.Join(testDataPath, "authorization", "systems"));
        foreach (var systemFolder in systemsFolder.GetDirectories())
        {
            var systemId = systemFolder.Name;
            var systemData = JsonSerializer.Deserialize<TestDataSystem>(await File.ReadAllBytesAsync(Path.Join(systemFolder.FullName, "system.json")))
                ?? throw new Exception("Failed to deserialize system data");
            systemData = systemData with { SystemUsers = new() };
            testData.Systems[systemId] = systemData;

            var systemUsersFolder = new DirectoryInfo(Path.Join(systemFolder.FullName, "systemusers"));
            foreach (var systemUserData in systemUsersFolder.GetFiles())
            {
                var systemUser = JsonSerializer.Deserialize<TestDataSystemUser>(await File.ReadAllBytesAsync(systemUserData.FullName))
                    ?? throw new Exception("Failed to deserialize system user data");
                systemUser = systemUser with { SystemId = systemId };
                testData.SystemUsers[systemUser.Id] = systemUser;
                systemData.SystemUsers[systemUser.Id] = systemUser;
            }
        }
    }

    private static async Task ReadRoles(string testDataPath, TestDataModel testData)
    {
        var rolesFolder = new DirectoryInfo(Path.Join(testDataPath, "authorization", "roles"));
        foreach (var userFolder in rolesFolder.GetDirectories())
        {
            var userId = userFolder.Name.Substring("User_".Length);
            var roleDict = new Dictionary<string, List<Role>>();
            foreach (var partiesFolder in userFolder.GetDirectories())
            {
                var party = partiesFolder.Name.Substring("party_".Length);
                var fileBytes = await File.ReadAllBytesAsync(Path.Join(partiesFolder.FullName, "roles.json"));
                var fileData = JsonSerializer.Deserialize<List<Role>>(fileBytes, _options)!;
                roleDict[party] = fileData;
            }
            testData.Authorization.Roles[userId] = roleDict;
        }
    }

    private static async Task ReadFolderToDictionary<T>(string folder, Dictionary<string, T> dict)
    {
        var directory = new DirectoryInfo(folder);
        var files = directory.GetFiles();
        var loadedFiles = await Task.WhenAll(files.Select(async file =>
        {
            var fileBytes = await File.ReadAllBytesAsync(file.FullName);
            var fileData = JsonSerializer.Deserialize<T>(fileBytes, _options);
            return KeyValuePair.Create(Path.GetFileNameWithoutExtension(file.Name), fileData!);
        }));
        foreach (var (filename, fileContent) in loadedFiles)
        {
            dict[filename] = fileContent;
        }
    }
}
