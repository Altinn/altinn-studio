using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Json.Schema;

namespace DataModeling.Tests.TestHelpers
{
    public static class EmbeddedResource
    {
        public async static Task<JsonSchema> LoadDataFromEmbeddedResourceAsJsonSchema(string resourceName)
        {
            var resourceStream = LoadDataFromEmbeddedResource(resourceName);

            var jsonSchema = await JsonSchema.FromStream(resourceStream);

            return jsonSchema;
        }

        public static string LoadDataFromEmbeddedResourceAsString(string resourceName)
        {
            var resourceStream = LoadDataFromEmbeddedResource(resourceName);

            using StreamReader reader = new StreamReader(resourceStream);
            string text = reader.ReadToEnd();

            return text;
        }

        public static Stream LoadDataFromEmbeddedResource(string resourceName)
        {
            var assembly = Assembly.GetExecutingAssembly();
            Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            return resource;
        }
    }
}
