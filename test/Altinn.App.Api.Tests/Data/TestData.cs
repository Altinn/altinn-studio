using Altinn.App.Api.Tests.Mocks;
using System.Linq;

namespace Altinn.App.Api.Tests.Data;

public static class TestData
{
    public static string GetTestDataRootDirectory()
    {
        var assemblyPath = new Uri(typeof(TestData).Assembly.Location).LocalPath;
        var assemblyFolder = Path.GetDirectoryName(assemblyPath);

        return Path.Combine(assemblyFolder!, @"../../../Data/");
    }

    public static string GetApplicationDirectory(string org, string app)
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Combine(testDataDirectory, "apps", org, app);
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
        return Path.Combine(applicationMetadataPath, "config", "applicationmetadata.json");
    }

    public static string GetInstancesDirectory()
    {
        string? testDataDirectory = GetTestDataRootDirectory();
        return Path.Combine(testDataDirectory!, @"Instances");
    }

    public static string GetDataDirectory(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        string instancesDirectory = GetInstancesDirectory();
        return Path.Combine(instancesDirectory, org, app, instanceOwnerId.ToString(), instanceGuid.ToString()) + Path.DirectorySeparatorChar;
    }

    public static string GetDataElementPath(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
    {
        string dataDirectory = GetDataDirectory(org, app, instanceOwnerId, instanceGuid);
        return Path.Combine(dataDirectory, $"{dataGuid}.json");
    }

    public static string GetDataBlobPath(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
    {
        string dataDirectory = GetDataDirectory(org, app, instanceOwnerId, instanceGuid);
        return Path.Combine(dataDirectory, "blob", dataGuid.ToString());
    }

    public static string GetTestDataRolesFolder(int userId, int resourcePartyId)
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Combine(testDataDirectory, @"authorization/Roles/User_" + userId, "party_" + resourcePartyId, "roles.json");
    }

    public static string GetAltinnAppsPolicyPath(string org, string app)
    {
        string testDataDirectory = GetTestDataRootDirectory();
        return Path.Combine(testDataDirectory, "apps", org, app, "config", "authorization") + Path.DirectorySeparatorChar;
    }

    public static void DeleteInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        string instancePath = GetInstancePath(org, app, instanceOwnerId, instanceGuid);
        if (File.Exists(instancePath))
        {
            File.Delete(instancePath);
        }
    }

    public static string GetInstancePath(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        string instancesDirectory = GetInstancesDirectory();
        return Path.Combine(instancesDirectory, org, app, instanceOwnerId.ToString(), instanceGuid + @".json");
    }

    public static void PrepareInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
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

    public static void DeleteInstanceAndData(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        DeleteDataForInstance(org, app, instanceOwnerId, instanceGuid);

        string instancePath = GetInstancePath(org, app, instanceOwnerId, instanceGuid);
        if (File.Exists(instancePath))
        {
            File.Delete(instancePath);
        }
    }

    public static void DeleteDataForInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
    {
        string path = GetDataDirectory(org, app, instanceOwnerId, instanceGuid);

        if (Directory.Exists(path))
        {
            foreach (var filePath in Directory.GetFiles(path, "*.*", SearchOption.AllDirectories).Where(filePath => !filePath.Contains("pretest")))
            {
                File.Delete(filePath);
            }

            if (Directory.GetFiles(path).Length == 0)
            {
                Directory.Delete(path, true);
            }
        }
    }
}
