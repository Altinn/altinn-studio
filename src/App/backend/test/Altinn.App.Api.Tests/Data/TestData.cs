using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Data;

public static class TestData
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
    };

    public static string GetTestDataRootDirectory()
    {
        var file = GetCallerFilePath();
        return (
                Path.GetDirectoryName(file)
                ?? throw new DirectoryNotFoundException(
                    $"Could not find directory for file {file}. Please check the test data root directory."
                )
            ) + '/';
    }

    private static string GetCallerFilePath([CallerFilePath] string file = "") => file;

    public static string GetApplicationDirectory(string org, string app)
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Join(testDataDirectory, "apps", org, app);
    }

    public static string GetAppSpecificTestdataDirectory(string org, string app)
    {
        var appDirectory = GetApplicationDirectory(org, app);
        return Path.Join(appDirectory, "_testdata_");
    }

    public static string GetAppSpecificTestdataFile(string org, string app, string fileName)
    {
        var appSpecifictTestdataDirectory = GetAppSpecificTestdataDirectory(org, app);
        return Path.Join(appSpecifictTestdataDirectory, fileName);
    }

    public static string GetApplicationMetadataPath(string org, string app)
    {
        string applicationMetadataPath = GetApplicationDirectory(org, app);
        return Path.Join(applicationMetadataPath, "config", "applicationmetadata.json");
    }

    public static string GetInstancesDirectory()
    {
        string? testDataDirectory = GetTestDataRootDirectory();
        return Path.Join(testDataDirectory!, @"Instances");
    }

    public static string GetDataDirectory(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        string instancesDirectory = GetInstancesDirectory();

        return Path.Join(instancesDirectory, org, app, instanceOwnerId.ToString(), instanceGuid.ToString())
            + Path.DirectorySeparatorChar;
    }

    public static (string org, string app) GetInstanceOrgApp(InstanceIdentifier identifier)
    {
        string instancesDirectory = GetInstancesDirectory();
        var instanceOwner = identifier.InstanceOwnerPartyId.ToString();
        var instanceId = identifier.InstanceGuid.ToString();

        foreach (var org in Directory.GetDirectories(instancesDirectory))
        {
            foreach (var app in Directory.GetDirectories(org))
            {
                var path = Path.Join(app, instanceOwner, instanceId);
                if (Directory.Exists(path))
                {
                    return (Path.GetFileName(org), Path.GetFileName(app));
                }
            }
        }

        throw new DirectoryNotFoundException(
            $"No instance found for instanceOwnerId {instanceOwner} and instanceGuid {instanceId}"
        );
    }

    public static string GetDataElementPath(
        string org,
        string app,
        int instanceOwnerId,
        Guid instanceGuid,
        Guid dataGuid
    )
    {
        string dataDirectory = GetDataDirectory(org, app, instanceOwnerId, instanceGuid);
        return Path.Join(dataDirectory, $"{dataGuid}.json");
    }

    public static string GetDataElementBlobContnet(
        string org,
        string app,
        int instanceOwnerId,
        Guid instanceGuid,
        Guid dataGuid
    )
    {
        string dataElementPath = GetDataBlobPath(org, app, instanceOwnerId, instanceGuid, dataGuid);
        return File.ReadAllText(dataElementPath);
    }

    public static string GetDataBlobPath(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
    {
        string dataDirectory = GetDataDirectory(org, app, instanceOwnerId, instanceGuid);
        return Path.Join(dataDirectory, "blob", dataGuid.ToString());
    }

    public static string GetTestDataRolesFolder(int userId, int resourcePartyId)
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Join(
            testDataDirectory,
            "authorization",
            "roles",
            "User_" + userId,
            "party_" + resourcePartyId,
            "roles.json"
        );
    }

    public static string GetAltinnAppsPolicyPath(string org, string app)
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Join(testDataDirectory, "apps", org, app, "config", "authorization") + Path.DirectorySeparatorChar;
    }

    public static string GetInstancePath(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        string instancesDirectory = GetInstancesDirectory();
        return Path.Join(instancesDirectory, org, app, instanceOwnerId.ToString(), instanceGuid + @".json");
    }

    public static void PrepareInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        DeleteInstanceAndData(org, app, instanceOwnerId, instanceGuid);
        string instancePath = GetInstancePath(org, app, instanceOwnerId, instanceGuid);

        string preInstancePath = instancePath.Replace(".json", ".pretest.json");

        File.Copy(preInstancePath, instancePath, true);

        string dataPath = GetDataDirectory(org, app, instanceOwnerId, instanceGuid);

        if (Directory.Exists(dataPath))
        {
            foreach (string filePath in Directory.GetFiles(dataPath, "*.*", SearchOption.AllDirectories))
            {
                if (filePath.Contains(".pretest.json"))
                {
                    // Handling all data elements
                    File.Copy(filePath, filePath.Replace(".pretest.json", ".json"), true);
                }
                else if (filePath.EndsWith(".pretest"))
                {
                    // Handling all data blobs
                    File.Copy(filePath, filePath.Replace(".pretest", string.Empty), true);
                }
            }
        }
    }

    public static void DeleteInstanceAndData(string org, string app, string instanceId)
    {
        string[] instanceIdParts = instanceId.Split('/');
        DeleteInstanceAndData(org, app, int.Parse(instanceIdParts[0]), Guid.Parse(instanceIdParts[1]));
    }

    public static void DeleteInstanceAndData(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        DeleteDataForInstance(org, app, instanceOwnerId, instanceGuid);

        string instancePath = GetInstancePath(org, app, instanceOwnerId, instanceGuid);
        if (File.Exists(instancePath))
        {
            File.Delete(instancePath);
        }
    }

    private static void DeleteDataForInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        string path = GetDataDirectory(org, app, instanceOwnerId, instanceGuid);

        if (Directory.Exists(path))
        {
            foreach (
                var filePath in Directory
                    .GetFiles(path, "*.*", SearchOption.AllDirectories)
                    .Where(filePath => !filePath.Contains("pretest"))
            )
            {
                File.Delete(filePath);
            }

            if (Directory.GetFiles(path).Length == 0)
            {
                Directory.Delete(path, true);
            }
        }
    }

    public static async Task<Instance> GetInstance(string org, string app, int instanceOwnerPartyId, Guid instanceGuid)
    {
        var path = GetInstancePath(org, app, instanceOwnerPartyId, instanceGuid);
        var instanceJson = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<Instance>(instanceJson, _jsonSerializerOptions)!;
    }
}
