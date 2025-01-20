using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Unicode;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;
using DataModeling.Tests.BaseClasses;
using DataModeling.Tests.Utils;
using Xunit;
using Xunit.Abstractions;

namespace DataModeling.Tests;

public class DataValidationWithModelPopulatingTests : CsharpModelConversionTestsBase<DataValidationWithModelPopulatingTests>
{
    private readonly ITestOutputHelper _testOutputHelper;

    public DataValidationWithModelPopulatingTests(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
    }

    private Type RepresentingType { get; set; }

    private object RandomRepresentingObject { get; set; }

    /// <summary>
    /// If xsd contains integer datatypes validation will fail since random object will be created as random decimal type
    /// Related task: https://github.com/Altinn/altinn-studio/issues/7866
    /// Also, enumeration restriction from xsd is not transferred to c# class.
    /// Related task: https://github.com/Altinn/altinn-studio/issues/9282
    /// </summary>
    [Theory]
    [ClassData(typeof(ValidationTestData))]
    public void Data_ShouldValidateAgainstSchemas(string xsdSchemaPath)
    {
        Given.That.XsdSchemaLoaded(xsdSchemaPath)
            .When.LoadedXsdSchemaConvertedToJsonSchema()
            .And.ConvertedJsonSchemaConvertedToModelMetadata()
            .And.ModelMetadataConvertedToCsharpClass()
            .And.CSharpClassesCompiledToAssembly();

        Assert.NotNull(CompiledAssembly);


        When.RepresentingTypeFromLoadedFromAssembly()
            .And.RandomRepresentingObjectGenerated()
            .Then.RepresentingObject_ShouldBeValid()
            .And.RepresentingObject_ShouldValidateAgainstXsdSchema()
            .And.RepresentingObject_ShouldValidateAgainstJsonSchema();
    }

    private DataValidationWithModelPopulatingTests RepresentingTypeFromLoadedFromAssembly()
    {
        RepresentingType = CompiledAssembly.GetTypes().Single(type => type.CustomAttributes.Any(att => att.AttributeType == typeof(XmlRootAttribute)));
        return this;
    }

    private DataValidationWithModelPopulatingTests RandomRepresentingObjectGenerated()
    {
        RandomRepresentingObject = RandomObjectModelGenerator.GenerateValidRandomObject(RepresentingType);
        return this;
    }

    private DataValidationWithModelPopulatingTests RepresentingObject_ShouldBeValid()
    {
        var isValid = Validator.TryValidateObject(RandomRepresentingObject, new ValidationContext(RandomRepresentingObject), null, true);

        Assert.True(isValid);
        return this;
    }

    private DataValidationWithModelPopulatingTests RepresentingObject_ShouldValidateAgainstXsdSchema()
    {
        static string SerializeXml(object o)
        {
            var xmlSerializer = new XmlSerializer(o.GetType());
            using var textWriter = new StringWriter();
            xmlSerializer.Serialize(textWriter, o);
            return textWriter.ToString();
        }

        var isValid = true;
        void ValidationEventHandler(object sender, ValidationEventArgs e)
        {
            if (e.Severity != XmlSeverityType.Error)
            {
                return;
            }

            _testOutputHelper.WriteLine(e.Message);
            isValid = false;
        }

        var xml = SerializeXml(RandomRepresentingObject);
        var document = new XmlDocument();
        document.Load(new StringReader(xml));
        document.Schemas.Add(LoadedXsdSchema);
        ValidationEventHandler eventHandler = ValidationEventHandler;
        document.Validate(eventHandler);

        Assert.True(isValid);

        return this;
    }

    private void RepresentingObject_ShouldValidateAgainstJsonSchema()
    {
        var json = JsonSerializer.Serialize(RandomRepresentingObject, new JsonSerializerOptions
        {
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement)
        });
        var jsonNode = JsonNode.Parse(json);
        var validationResults = ConvertedJsonSchema.Evaluate(jsonNode);

        Assert.True(validationResults.IsValid);
    }
}
