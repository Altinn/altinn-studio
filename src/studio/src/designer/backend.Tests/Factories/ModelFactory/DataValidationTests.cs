using System;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Unicode;
using System.Xml.Serialization;
using Designer.Tests.Factories.ModelFactory.BaseClasses;
using Designer.Tests.Factories.ModelFactory.DataClasses;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory;

public class DataValidationTests: Xsd2CsharpBaseClass<DataValidationTests>
{
    private Type RepresentingType { get; set; }

    private object RandomRepresentingObject { get; set; }

    [Theory]
    [ClassData(typeof(ValidationTestData))]
    public void Data_ShouldValidateAgainstSchemas(string xsdSchemaPath)
    {
        Given.That.XsdSchemaLoaded(xsdSchemaPath)
            .When.XsdSchemaConverted2JsonSchema()
            .And.JsonSchemaConverted2Metamodel()
            .And.CSharpClassesCreatedFromMetamodel()
            .And.CSharpClassesCompiledToAssembly()
            .Then.CompiledAssembly.Should().NotBeNull();

        When.RepresentingTypeFromLoadedFromAssembly()
            .And.RandomRepresentingObjectGenerated()
            .Then.RepresentingObject_ShouldValidateAgainstXsdSchema()
            .And.RepresentingObject_ShouldValidateAgainstJsonSchema();
    }

    private DataValidationTests RepresentingTypeFromLoadedFromAssembly()
    {
        RepresentingType = CompiledAssembly.Types().Single(type => type.CustomAttributes.Any(att => att.AttributeType == typeof(XmlRootAttribute)));
        return this;
    }

    private DataValidationTests RandomRepresentingObjectGenerated()
    {
        // TODO: Generate random object here
        RandomRepresentingObject = Activator.CreateInstance(RepresentingType);
        return this;
    }

    private DataValidationTests RepresentingObject_ShouldValidateAgainstXsdSchema()
    {
        // TODO: serialize to Xml and validate against loaded xsdSchema
        return this;
    }

    private void RepresentingObject_ShouldValidateAgainstJsonSchema()
    {
        var json = JsonSerializer.Serialize(RandomRepresentingObject, new JsonSerializerOptions
        {
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement)
        });
        var jsonNode = JsonNode.Parse(json);
        var validationResults = ConvertedJsonSchema.Validate(jsonNode);
        validationResults.IsValid.Should().BeTrue();
    }
}
