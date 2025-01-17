using System;
using System.Linq;
using System.Xml.Linq;
using System.Xml.Serialization;
using DataModeling.Tests.BaseClasses;
using DataModeling.Tests.Utils;
using SharedResources.Tests;
using Xunit;

namespace DataModeling.Tests;

public class XmlDeserializeSerializeTests : CsharpModelConversionTestsBase<XmlDeserializeSerializeTests>
{
    [Theory]
    [InlineData("Model/XmlSchema/XsAll/xsall-example.xsd", "Model/Xml/XsAll/xsall-example-nillable-sample.xml")]
    public void XmlDeserializeSerializeShouldKeepNillValue(string xsdSchemaPath, string xmlPath)
    {
        Given.That.XsdSchemaLoaded(xsdSchemaPath)
            .When.LoadedXsdSchemaConvertedToJsonSchema()
            .And.ConvertedJsonSchemaConvertedToModelMetadata()
            .And.ModelMetadataConvertedToCsharpClass()
            .And.CSharpClassesCompiledToAssembly();

        Assert.NotNull(CompiledAssembly);

        And.DeserializeAndSerializeShouldProduceSameXml(xmlPath);
    }

    private void DeserializeAndSerializeShouldProduceSameXml(string xmlPath)
    {
        Type csharpType = CompiledAssembly.GetTypes().Single(type => type.CustomAttributes.Any(att => att.AttributeType == typeof(XmlRootAttribute)));

        string loadedXml = SharedResourcesHelper.LoadTestDataAsString(xmlPath);

        // Deserialize xml to new object of type csharpType
        object deserializedObject = SerializationHelper.Deserialize(loadedXml, csharpType);

        // serialize xml back to string
        string serializedXml = SerializationHelper.SerializeXml(deserializedObject);

        // Compare the original xml with the serialized xml
        var expected = XDocument.Parse(loadedXml);
        var result = XDocument.Parse(serializedXml);
        Assert.True(XNode.DeepEquals(expected, result));
    }
}
