using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
using FluentAssertions;
using Manatee.Json;
using Manatee.Json.Schema;
using Xunit;
using Xunit.Abstractions;
using InfoKeyword = Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json.InfoKeyword;
using XmlSchemaValidator = Designer.Tests.Utils.XmlSchemaValidator;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchema2Metadata2CSharpTests: FluentTestsBase<JsonSchema2Metadata2CSharpTests>
    {
        private readonly ITestOutputHelper _outputHelper;

        private JsonSchema _jsonSchema;
        private ModelMetadata _modelMetadataOldWay;
        private string _csharpClasses;
        private Assembly _compiledAssembly;
        private Type _typeFromAssembly;
        private object _deserializedJsonObjectFromAssemblyType;
        private string _serializedManateeObject;
        private XmlSchema _xsdSchema;
        private object _deserializedXmlObject;
        private object _modelInstanceFromType;

        private JsonSchema _expectedJsonSchema;
        private Type _expectedType;
        private object _expectedInstanceFromType;
        private object _expectedXmlObject;
        private object _expectedJsonObject;

        public JsonSchema2Metadata2CSharpTests(ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;
        }

        [Fact]
        public async Task InlineSchema_ShouldSerializeToCSharp()
        {
            var jsonSchemaString =
                @"{""properties"":{""melding"":{""properties"":{""test"":{""type"":""object"",""properties"":{""navn"":{""type"":""string""}}}},""type"":""object""}},""definitions"":{}, ""required"": [""melding""]}";
            const string jsonStr = @"{""test"":{""navn"":""Ronny""}}";
            const string xmlStr = "<melding><test><navn>Ronny</navn></test></melding>";

            // Preparing objects using old classes and metadata.
            await Given.That.JsonSchemaLoadedWithContentString(jsonSchemaString);

            When.ModelMetadataCreatedFromJsonSchemaOldWay("yabbin", "datamodelling")
                .And.CSharpClassesGeneratedFromModelMetadata()
                .And.Then.CSharpClassesCompiledToAssembly()
                .And.TypeReadFromAssembly("Altinn.App.Models.melding")
                .And.JsonObjectDeserializedToTypeFromAssembly(
                    @"{""test"":{""navn"":""Ronny""}}")
                .And.Then
                .DeserializedJsonObjectSerializedToStringWithManatee()
                .Then.JsonStringShouldBeTheSameAsSerializedObjectWithManatee(jsonStr)
                .And.SerializedManateeObjectShouldBeValidAgainstJsonSchema()
                .And.JsonShouldBeValidAgainstJsonSchema(jsonStr)
                .And.When
                .LoadedJsonSchemaConvertedToXsdSchemaOld()
                .Then.XmlShouldBeValidWithXsdSchema(xmlStr)
                .And.When
                .XmlObjectDeserializedToTypeFromAssembly(xmlStr)
                .Then.DeserializedJsonObjectFromAssemblyShouldBeEquivalentToDeserializedXmlObjectFromAssembly();
        }

        // TODO: This is the one that should work
        // [InlineData("Designer.Tests._TestData.Model.JsonSchema.hvem-er-hvem.json", "Altinn.App.Models.HvemErHvem_M", "{\"melding\":{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        [Theory]
        [InlineData("Designer.Tests._TestData.Model.JsonSchema.hvem-er-hvem.json", "Altinn.App.Models.HvemErHvem_M", "{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        public void SeresSchema_ShouldSerializeToCSharp(string resourceName, string modelName, string json, string xml)
        {
            // Preparing objects using old classes and metadata.
            Given.That.JsonSchemaLoaded(resourceName)
                .And.ModelMetadataCreatedFromJsonSchemaOldWay("yabbin", "hvem-er-hvem")
                .And.CSharpClassesGeneratedFromModelMetadata()
                .When.CSharpClassesCompiledToAssembly()
                .And.TypeReadFromAssembly(modelName)
                .And.JsonObjectDeserializedToTypeFromAssembly(json)
                .And.DeserializedJsonObjectSerializedToStringWithManatee()
                .Then.JsonStringShouldBeTheSameAsSerializedObjectWithManatee(json)
                .And.When
                .XmlObjectDeserializedToTypeFromAssembly(xml)
                .And.LoadedJsonSchemaConvertedToXsdSchemaOld()
                .Then.XmlShouldBeValidWithXsdSchema(xml)
                .And.DeserializedJsonObjectFromAssemblyShouldBeEquivalentToDeserializedXmlObjectFromAssembly();
        }

        [Theory]
        [InlineData("Designer.Tests._TestData.Model.Xsd.or-melding-2-12186.xsd", "Altinn.App.Models.Skjema", "Designer.Tests._TestData.Model.JsonSchema.or-melding-2-12186.expected.schema.json", "Designer.Tests._TestData.Model.CSharp.or-melding-2-12186.expected.csharp.txt")]
        [InlineData("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "Designer.Tests._TestData.Model.JsonSchema.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.expected.schema.json", "Designer.Tests._TestData.Model.CSharp.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.expected.csharp.txt")]
        public void SeresOrXmlSchema_ShouldSerializeToCSharp(string xsdResource, string modelName, string expectedJsonSchemaResource, string expectedCSharpResource)
        {
            // Preparing objects using old classes and metadata.
            Given.That.InfoKeywordAddedToSchemaKeywordCatalog()
                .When.JsonSchemaLoadedFromXsdResourceOldWay(xsdResource)
                .And.ExpectedJsonSchemaLoaded(expectedJsonSchemaResource)
                .Then.JsonSchemaShouldBeEquivalentToExpected()
                .And.When.ModelMetadataCreatedFromJsonSchemaOldWay("yabbin", "hvem-er-hvem")
                .And.CSharpClassesGeneratedFromModelMetadata()
                .And.CSharpClassesCompiledToAssembly()
                .And.TypeReadFromAssembly(modelName)
                .And.ModelInstanceObjectCreatedFromType()
                .Then.TypeShouldBeDecoratedWithXmlRootAttribute()
                .And.When.ExpectedTypeAndInstanceObjectLoadedFromCsharpResource(expectedCSharpResource, modelName)
                .Then.TypeShouldHasSameMetadataDefinitionAsExpected()
                .And.ModelInstanceObjectShouldBeEquivalentToExpected();
        }

        [Theory]
        [InlineData("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        public void XSD_ConvertToCSharp_NewAndOldShouldResultInSameCSharp(string xsdResource, string modelName, string jsonModel, string xmlModel)
        {
            // Preparing objects using old classes and metadata.
            Given.That.JsonSchemaKeywordsRegistered()
                .And.JsonSchemaLoadedFromXsdResourceOldWay(xsdResource)
                .And.ModelMetadataCreatedFromJsonSchemaOldWay("yabbin", "hvem-er-hvem")
                .And.CSharpClassesGeneratedFromModelMetadata()
                .And.CSharpClassesCompiledToAssembly()
                .And.TypeReadFromAssembly(modelName)
                .And.JsonObjectDeserializedToTypeFromAssembly(jsonModel)
                .And.XmlObjectDeserializedToTypeFromAssembly(xmlModel)

                // Create expected objects created with new classes.
                .When.ExpectedJsonAndXmlObjectCreatedNewWay(
                    "yabbin",
                    "hvem-er-hvem",
                    xsdResource,
                    modelName,
                    jsonModel,
                    xmlModel)
                .Then.JsonObjectShouldBeEquivalentToExpected()
                .And.XmlObjectShouldBeEquivalentToExpected()
                .And.ExpectedJsonObjectShouldBeEquivalentToExpectedXmlObject();
        }

        private static Assembly CreateCSharpInstanceNewWay(string xsdResource, string org, string app, string modelName)
        {
            var modelMetadataNew = CreateMetamodelNewWay(xsdResource, org, app);
            var classesNewWay = GenerateCSharpClasses(modelMetadataNew);
            var assembly = Compiler.CompileToAssembly(classesNewWay);

            return assembly;
        }

        /// <summary>
        /// Parses the XSD, generates Json Schema and generates the meta model using
        /// the old classes.
        /// </summary>
        private static ModelMetadata CreateMetamodelOldWay(string xsdResource, string org, string app)
        {
            Stream xsdStream = TestDataHelper.LoadDataFromEmbeddedResource(xsdResource);
            XmlReader xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });

            XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader);
            JsonSchema jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

            ModelMetadata modelMetadata = GenerateModelMetadata(org, app, jsonSchema);

            return modelMetadata;
        }

        /// <summary>
        /// Parses the XSD, generates Json Schema and generates the meta model using
        /// the new classes.
        /// </summary>
        private static ModelMetadata CreateMetamodelNewWay(string xsdResource, string org, string app)
        {
            Stream xsdStream = TestDataHelper.LoadDataFromEmbeddedResource(xsdResource);
            XmlReader xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });
            var xmlSchema = XmlSchema.Read(xmlReader, (_, _) => { });
            var schemaSet = new XmlSchemaSet();
            schemaSet.Add(xmlSchema);
            schemaSet.Compile();

            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            Json.Schema.JsonSchema convertedJsonSchema = xsdToJsonConverter.Convert(xmlSchema);
            var convertedJsonSchemaString = JsonSerializer.Serialize(convertedJsonSchema, new JsonSerializerOptions() { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement), WriteIndented = true });

            var metamodelConverter = new JsonSchemaToMetamodelConverter(new SeresJsonSchemaAnalyzer());

            ModelMetadata actualMetamodel = metamodelConverter.Convert("melding", convertedJsonSchemaString);
            return actualMetamodel;
        }

        private static async Task<JsonSchema> ParseJsonSchema(string jsonSchemaString)
        {
            TextReader textReader = new StringReader(jsonSchemaString);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);
            return jsonSchema;
        }

        private static ModelMetadata GenerateModelMetadata(string org, string app, JsonSchema jsonSchema)
        {
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, app, jsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            string root = modelMetadata.Elements != null && modelMetadata.Elements.Count > 0 ? modelMetadata.Elements.Values.First(e => e.ParentElement == null).TypeName : null;
            string model = converter.GetInstanceModel().ToString();

            return modelMetadata;
        }

        private static string GenerateCSharpClasses(ModelMetadata modelMetadata)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();
            string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
            return classes;
        }

        // Fluent methods
        private JsonSchema2Metadata2CSharpTests JsonSchemaLoaded(string resourceName)
        {
            _jsonSchema = TestDataHelper.LoadDataFromEmbeddedResourceAsJsonSchema(resourceName);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests ExpectedJsonSchemaLoaded(string resourceName)
        {
            _expectedJsonSchema = TestDataHelper.LoadDataFromEmbeddedResourceAsJsonSchema(resourceName);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests JsonSchemaLoadedFromXsdResourceOldWay(string xsdResource)
        {
            Stream xsdStream = TestDataHelper.LoadDataFromEmbeddedResource(xsdResource);
            XmlReader xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });

            // Compare generated JSON Schema
            XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader);
            _jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();
            return this;
        }

        private async Task<JsonSchema2Metadata2CSharpTests> JsonSchemaLoadedWithContentString(string jsonSchemaString)
        {
            _jsonSchema = await ParseJsonSchema(jsonSchemaString);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests InfoKeywordAddedToSchemaKeywordCatalog()
        {
            SchemaKeywordCatalog.Add<InfoKeyword>();
            return this;
        }

        private JsonSchema2Metadata2CSharpTests JsonSchemaKeywordsRegistered()
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
            return this;
        }

        private JsonSchema2Metadata2CSharpTests ModelMetadataCreatedFromJsonSchemaOldWay(string org, string app)
        {
            _modelMetadataOldWay = GenerateModelMetadata(org, app, _jsonSchema);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests CSharpClassesGeneratedFromModelMetadata()
        {
            _csharpClasses = GenerateCSharpClasses(_modelMetadataOldWay);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests CSharpClassesCompiledToAssembly()
        {
            _compiledAssembly = Compiler.CompileToAssembly(_csharpClasses);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests TypeReadFromAssembly(string typeName)
        {
            _typeFromAssembly = _compiledAssembly.GetType(typeName);

            return this;
        }

        private JsonSchema2Metadata2CSharpTests JsonObjectDeserializedToTypeFromAssembly(string json)
        {
            _deserializedJsonObjectFromAssemblyType = JsonSerializer.Deserialize(json, _typeFromAssembly);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests DeserializedJsonObjectSerializedToStringWithManatee()
        {
            _serializedManateeObject = new Manatee.Json.Serialization.JsonSerializer().Serialize(_deserializedJsonObjectFromAssemblyType).ToString();
            return this;
        }

        private JsonSchema2Metadata2CSharpTests LoadedJsonSchemaConvertedToXsdSchemaOld()
        {
            var jsonSchemaToXsd = new JsonSchemaToXsd();
            _xsdSchema = jsonSchemaToXsd.CreateXsd(_jsonSchema);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests XmlObjectDeserializedToTypeFromAssembly(string xml)
        {
            _deserializedXmlObject = SerializationHelper.Deserialize(xml, _typeFromAssembly);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests ExpectedTypeAndInstanceObjectLoadedFromCsharpResource(string csharpResource, string modelName)
        {
            string expectedClasses = TestDataHelper.LoadDataFromEmbeddedResourceAsString(csharpResource);
            Assembly expectedAssembly = Compiler.CompileToAssembly(expectedClasses);
            _expectedType = expectedAssembly.GetType(modelName);
            _expectedInstanceFromType = expectedAssembly.CreateInstance(_expectedType.FullName);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests ExpectedJsonAndXmlObjectCreatedNewWay(string org, string app, string xsdResource, string modelName, string jsonModel, string xmlModel)
        {
            var assemblyNew = CreateCSharpInstanceNewWay(xsdResource, org, app, modelName);
            var newType = assemblyNew.GetType(modelName);
            _expectedJsonObject = JsonSerializer.Deserialize(jsonModel, newType);
            _expectedXmlObject = SerializationHelper.Deserialize(xmlModel, newType);
            return this;
        }

        // Assertion Methods
        private JsonSchema2Metadata2CSharpTests JsonStringShouldBeTheSameAsSerializedObjectWithManatee(string json)
        {
            Assert.Equal(json, _serializedManateeObject);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests SerializedManateeObjectShouldBeValidAgainstJsonSchema()
        {
            return JsonShouldBeValidAgainstJsonSchema(_serializedManateeObject);
        }

        private JsonSchema2Metadata2CSharpTests JsonShouldBeValidAgainstJsonSchema(string json)
        {
            var jsonValidationResult = _jsonSchema.Validate(new JsonValue(json), new JsonSchemaOptions { });
            Assert.True(jsonValidationResult.IsValid);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests XmlShouldBeValidWithXsdSchema(string xml)
        {
            var xmlSchemaValidator = new XmlSchemaValidator(_xsdSchema);
            Assert.True(xmlSchemaValidator.Validate(xml));
            return this;
        }

        private JsonSchema2Metadata2CSharpTests DeserializedJsonObjectFromAssemblyShouldBeEquivalentToDeserializedXmlObjectFromAssembly()
        {
            _deserializedJsonObjectFromAssemblyType.Should().BeEquivalentTo(_deserializedXmlObject);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests JsonSchemaShouldBeEquivalentToExpected()
        {
            _expectedJsonSchema.Should().BeEquivalentTo(_jsonSchema);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests TypeShouldBeDecoratedWithXmlRootAttribute()
        {
            _typeFromAssembly.Should().BeDecoratedWith<XmlRootAttribute>();
            return this;
        }

        private JsonSchema2Metadata2CSharpTests ModelInstanceObjectCreatedFromType()
        {
            _modelInstanceFromType = _compiledAssembly.CreateInstance(_typeFromAssembly.FullName);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests TypeShouldHasSameMetadataDefinitionAsExpected()
        {
            _typeFromAssembly.HasSameMetadataDefinitionAs(_expectedType);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests ModelInstanceObjectShouldBeEquivalentToExpected()
        {
            _modelInstanceFromType.Should().BeEquivalentTo(_expectedInstanceFromType);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests JsonObjectShouldBeEquivalentToExpected()
        {
            _deserializedJsonObjectFromAssemblyType.Should().BeEquivalentTo(_expectedJsonObject);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests XmlObjectShouldBeEquivalentToExpected()
        {
            _deserializedXmlObject.Should().BeEquivalentTo(_expectedXmlObject);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests ExpectedJsonObjectShouldBeEquivalentToExpectedXmlObject()
        {
            _expectedJsonObject.Should().BeEquivalentTo(_expectedXmlObject);
            return this;
        }
    }
}
