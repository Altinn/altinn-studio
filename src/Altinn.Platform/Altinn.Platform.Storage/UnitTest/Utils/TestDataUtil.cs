using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace App.IntegrationTests.Utils
{
    public class TestDataUtil
    {


        public static void PrepareInstance(int instanceOwnerId, Guid instanceGuid)
        {
            string instancePath = GetInstancePath(instanceOwnerId, instanceGuid);

            string preInstancePath = instancePath.Replace(".json", ".pretest.json");

            File.Copy(preInstancePath, instancePath);
        }

        public static void DeleteInstance(int instanceOwnerId, Guid instanceGuid)
        {
            string instancePath = GetInstancePath(instanceOwnerId, instanceGuid);
            if (File.Exists(instancePath))
            {
                File.Delete(instancePath);
            }
        }

        public static void DeleteInstanceAndData(int instanceOwnerId, Guid instanceGuid)
        {
           DeleteDataForInstance(instanceOwnerId, instanceGuid);

            string instancePath = GetInstancePath(instanceOwnerId, instanceGuid);
            if (File.Exists(instancePath))
            {
                File.Delete(instancePath);
            }
        }

        public static void DeleteDataForInstance(int instanceOwnerId, Guid instanceGuid)
        {
            string path = GetDataPath(instanceOwnerId, instanceGuid);
            if (Directory.Exists(path))
            {
                Directory.Delete(path, true);
            }
        }

        private static string GetInstancePath(int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\instances\", instanceOwnerId + @"\", instanceGuid.ToString() + @".json");
        }

        private static string GetDataPath(int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\instances\", instanceOwnerId + @"\", instanceGuid.ToString());
        }

        private static string GetDataBlobPath(int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TestDataUtil).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\instances\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\blob\" + dataId.ToString());
        }
    }
}
