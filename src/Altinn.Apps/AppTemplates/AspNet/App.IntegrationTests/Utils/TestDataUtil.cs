using System;
using System.IO;

using App.IntegrationTests.Mocks.Services;

namespace App.IntegrationTests.Utils
{
    public class TestDataUtil
    {
        public static void PrepareInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string instancePath = GetInstancePath(org, app, instanceOwnerId, instanceGuid);

            string preInstancePath = instancePath.Replace(".json", ".pretest.json");

            File.Copy(preInstancePath, instancePath, true);
        }

        public static void DeleteInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string instancePath = GetInstancePath(org, app, instanceOwnerId, instanceGuid);
            if (File.Exists(instancePath))
            {
                File.Delete(instancePath);
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
            string path = GetDataPath(org, app, instanceOwnerId, instanceGuid);
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }
        }

        private static string GetInstancePath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @".json");
        }

        private static string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
        }

        private static string GetDataBlobPath(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\blob\" + dataId.ToString());
        }
    }
}
