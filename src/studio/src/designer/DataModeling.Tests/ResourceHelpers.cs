using System;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Json.Schema;

namespace DataModeling.Tests
{
    [ExcludeFromCodeCoverage]
    public static class ResourceHelpers
    {
        public static async Task<JsonSchema> LoadJsonSchemaTestData(string resourceName)
        {
            await using Stream jsonStream = LoadTestData(resourceName);
            return await JsonSerializer.DeserializeAsync<JsonSchema>(jsonStream, new JsonSerializerOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
        }

        public static string LoadTestDataAsString(string resourceName)
        {
            string path = Path.Combine(GetUnitTestFolder(), resourceName);
            return File.ReadAllText(path);
        }

        public static XmlSchema LoadXmlSchemaTestData(string resourceName)
        {
            using XmlReader xmlReader = XmlReader.Create(LoadTestData(resourceName));
            return XmlSchema.Read(xmlReader, (_, _) => { });
        }

        public static Stream LoadTestData(string resourceName)
        {
            string unitTestFolder = GetUnitTestFolder();
            Stream resource = File.OpenRead(Path.Combine(unitTestFolder, resourceName));

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }

        private static string GetUnitTestFolder()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ResourceHelpers).Assembly.Location).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            return unitTestFolder;
        }

        public static Stream OpenTestDataStream(string resourceName)
        {
            string unitTestFolder = GetUnitTestFolder();
            string path = Path.Combine(unitTestFolder, resourceName);
            return File.Open(path, File.Exists(path) ? FileMode.Truncate : FileMode.CreateNew, FileAccess.Write);
        }
    }
}
