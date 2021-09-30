using System;
using System.IO;
using System.Text.Json;

using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Mocks.Services;

namespace App.IntegrationTests.Utils
{
    public static class TestDataUtil
    {
        private static JsonSerializerOptions serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public static void PrepareInstance(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string instancePath = GetInstancePath(org, app, instanceOwnerId, instanceGuid);

            string preInstancePath = instancePath.Replace(".json", ".pretest.json");

            File.Copy(preInstancePath, instancePath, true);

            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);

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

        public static void PrepareDataElement(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);
            string dataElementPath = Path.Combine(dataPath, dataGuid.ToString() + ".pretest.json");

            if (File.Exists(dataElementPath))
            {
                File.Copy(dataElementPath, dataElementPath.Replace(".pretest.json", ".json"), true);
            }
        }

        public static void AddDataElement(string org, string app, int instanceOwnerId, Guid instanceGuid, DataElement dataElement)
        {
            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);
            string dataElementPath = Path.Combine(dataPath, dataElement.Id + ".json");

            if (File.Exists(dataElementPath))
            {
                throw new ArgumentException("DataElement already exists");
            }

            string jsonData = JsonSerializer.Serialize(dataElement, serializerOptions);
            using StreamWriter sw = new StreamWriter(dataElementPath);

            sw.Write(jsonData.ToString());
            sw.Close();
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
                foreach (string filePath in Directory.GetFiles(path, "*.*", SearchOption.AllDirectories))
                {
                    if (!filePath.Contains("pretest"))
                    {
                        File.Delete(filePath);
                    }
                }

                if (Directory.GetFiles(path).Length == 0)
                {
                    Directory.Delete(path, true);
                }
            }
        }

        public static void DeleteDataElement(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            string dataPath = GetDataPath(org, app, instanceOwnerId, instanceGuid);
            string dataElementPath = Path.Combine(dataPath, dataGuid.ToString() + ".json");

            if (File.Exists(dataElementPath))
            {
                File.Delete(dataElementPath);
            }
        }

        public static Application GetApplication(string org, string app)
        {
            string path = GetApplicationPath(org, app);

            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                Application application = JsonSerializer.Deserialize<Application>(
                    content,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                return application;
            }

            return null;
        }

        private static string GetApplicationPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\apps\", org + @"\", app + @"\config\applicationmetadata.json");
        }

        private static string GetInstancePath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @".json");
        }

        private static string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", org + @"\", app + @"\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
        }
    }
}
