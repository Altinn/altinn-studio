using System.IO;
using System.Linq;
using System.Reflection;
using System.Xml;
using System.Xml.Schema;
using Json.Schema;

namespace SharedResources.Tests;

public static class SharedResourcesHelper
{
    private static readonly Assembly s_sharedResourcesAssembly = typeof(SharedResourcesHelper).Assembly;

    public static string LoadTestDataAsString(string resourceName)
    {
        var resourceStream = LoadTestData(resourceName);
        using var reader = new StreamReader(resourceStream);
        return reader.ReadToEnd();
    }

    public static Stream LoadTestData(string resourceName)
    {
        string resourceNameEnding = resourceName.Replace('/', '.');
        string embeddedResourceName = s_sharedResourcesAssembly.GetManifestResourceNames()
            .Single(x => x.EndsWith(resourceNameEnding));
        return s_sharedResourcesAssembly.GetManifestResourceStream(embeddedResourceName);
    }

    public static JsonSchema LoadJsonSchemaTestData(string resourceName)
    {
        var jsonString = LoadTestDataAsString(resourceName);
        return JsonSchema.FromText(jsonString);
    }

    public static XmlSchema LoadXmlSchemaTestData(string resourceName)
    {
        using XmlReader xmlReader = XmlReader.Create(LoadTestData(resourceName));
        var xmlSchema = XmlSchema.Read(xmlReader, (_, _) => { });

        var schemaSet = new XmlSchemaSet();
        schemaSet.Add(xmlSchema);
        schemaSet.Compile();

        return xmlSchema;
    }

    public static void WriteUpdatedTestData(string resourceName, string cSharpClasses)
    {
        File.WriteAllText(Path.Join("..", "..", "..", "..", "..", "..", "testdata", resourceName), cSharpClasses);
    }
}
