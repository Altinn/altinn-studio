using System;
using System.IO;
using System.Reflection;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;

namespace Designer.Tests.Utils
{
    public static class TestDataHelper
    {
        public static JsonSchema LoadTestDataAsJsonSchema(string resourceName)
        {
            var assembly = Assembly.GetExecutingAssembly();
            using Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            using StreamReader streamReader = new StreamReader(resource);
            JsonValue jsonValue = JsonValue.Parse(streamReader);
            return new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
        }

        public static Stream LoadTestDataFromFile(string resourceName)
        {
            var assembly = Assembly.GetExecutingAssembly();
            string unitTestFolder = Path.GetDirectoryName(new Uri(assembly.Location).LocalPath);
            unitTestFolder = Path.Combine(unitTestFolder, @"..\..\..\_TestData\");
            Stream resource = File.OpenRead(unitTestFolder + resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data.");
            }

            return resource;
        }
    }
}
