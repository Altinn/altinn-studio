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

using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Designer.Tests.Utils;
using FluentAssertions;
using Manatee.Json;
using Manatee.Json.Schema;
using Xunit;
using Xunit.Abstractions;
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
        private object _deserializedObjectFromAssemblyType;
        private string _serializedManateeObject;
        private XmlSchema _xsdSchema;
        private object _deserializedXmlObject;
        private object _modelInstanceFromType;

        private JsonSchema _expectedJsonSchema;
        private Type _expectedType;
        private object _expectedInstanceFromType;

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

            await Given.That.JsonSchemaLoadedWithContentString(jsonSchemaString);

            When.ModelMetadataCreatedFromJsonSchemaOldWay("yabbin", "datamodelling")
                .And.CSharpClassesGeneratedFromModelMetadata()
                .And.Then.CSharpClassesCompiledToAssembly()
                .And.TypeReadFromAssembly("Altinn.App.Models.melding")
                .And.ObjectDeserializedToTypeFromAssembly(
                    @"{""test"":{""navn"":""Ronny""}}")
                .And.Then
                .DeserializedObjectSerializedToStringWithManatee()
                .Then.JsonStringShouldBeTheSameAsSerializedObjectWithManatee(jsonStr)
                .And.SerializedManateeObjectShouldBeValidAgainstJsonSchema()
                .And.JsonShouldBeValidAgainstJsonSchema(jsonStr)
                .And.LoadedJsonSchemaConvertedToXsdSchemaOld()
                .Then.XmlShouldBeValidWithXsdSchema(xmlStr)
                .And.When
                .XmlDeserializedToTypeFromAssembly(xmlStr)
                .Then.DeserializedObjectFromAssemblyShouldBeEquivalentToDeserializedXmlObjectFromAssembly();
        }

        // TODO: This is the one that should work
        // [InlineData("Designer.Tests._TestData.Model.JsonSchema.hvem-er-hvem.json", "Altinn.App.Models.HvemErHvem_M", "{\"melding\":{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        [Theory]
        [InlineData("Designer.Tests._TestData.Model.JsonSchema.hvem-er-hvem.json", "Altinn.App.Models.HvemErHvem_M", "{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        public void SeresSchema_ShouldSerializeToCSharp(string resourceName, string modelName, string json, string xml)
        {
            Given.That.JsonSchemaLoaded(resourceName)
                .And.ModelMetadataCreatedFromJsonSchemaOldWay("yabbin", "hvem-er-hvem")
                .And.CSharpClassesGeneratedFromModelMetadata()
                .When.CSharpClassesCompiledToAssembly()
                .And.TypeReadFromAssembly(modelName)
                .And.ObjectDeserializedToTypeFromAssembly(json)
                .And.DeserializedObjectSerializedToStringWithManatee()
                .Then.JsonStringShouldBeTheSameAsSerializedObjectWithManatee(json)
                .And.When
                .XmlDeserializedToTypeFromAssembly(xml)
                .And.LoadedJsonSchemaConvertedToXsdSchemaOld()
                .Then.XmlShouldBeValidWithXsdSchema(xml)
                .And.DeserializedObjectFromAssemblyShouldBeEquivalentToDeserializedXmlObjectFromAssembly();
        }

        [Theory]
        [InlineData("Designer.Tests._TestData.Model.Xsd.or-melding-2-12186.xsd", "Altinn.App.Models.Skjema", "Designer.Tests._TestData.Model.JsonSchema.or-melding-2-12186.expected.schema.json", "Designer.Tests._TestData.Model.CSharp.or-melding-2-12186.expected.csharp.txt")]
        [InlineData("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "Designer.Tests._TestData.Model.JsonSchema.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.expected.schema.json", "Designer.Tests._TestData.Model.CSharp.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.expected.csharp.txt")]
        public void SeresOrXmlSchema_ShouldSerializeToCSharp(string xsdResource, string modelName, string expectedJsonSchemaResource, string expectedCSharpResource)
        {
            Given.That.InfoKeywordAddedToSchemaKeywordCatalog()
                .When.JsonSchemaLoadedFromXsdResourceOldWay(xsdResource)
                .And.ExpectedJsonSchemaLoaded(expectedJsonSchemaResource)
                .Then.JsonSchemaShouldBeEquivalentWithExpected()
                .And.When.ModelMetadataCreatedFromJsonSchemaOldWay("yabbin", "hvem-er-hvem")
                .And.CSharpClassesGeneratedFromModelMetadata()
                .And.CSharpClassesCompiledToAssembly()
                .And.TypeReadFromAssembly(modelName)
                .And.ModelInstanceObjectCreatedFromType()
                .Then.TypeShouldBeDecoratedWithXmlRootAttribute()
                .And.When.ExpectedTypeAndInstanceObjectLoadedFromCsharpResource(expectedCSharpResource, modelName)
                .Then.TypeShouldHasSameMetadataDefinitionAsExpected()
                .And.ModelInstanceObjectShouldBeEquivalentAsExpected();
        }

        [Theory]
        [InlineData("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        public void XSD_ConvertToCSharp_NewAndOldShouldResultInSameCSharp(string xsdResource, string modelName, string jsonModel, string xmlModel)
        {
            Given.That.JsonSchemaKeywordsRegistered();

            Altinn.Studio.DataModeling.Json.Keywords.JsonSchemaKeywords.RegisterXsdKeywords();
            var org = "yabbin";
            var app = "hvem-er-hvem";

            Assembly assemblyOld = CreateCSharpInstanceOldWay(xsdResource, org, app, modelName);
            Assembly assemblyNew = CreateCSharpInstanceNewWay(xsdResource, org, app, modelName);

            Type oldType = assemblyOld.GetType(modelName);
            Type newType = assemblyNew.GetType(modelName);

            object oldJsonObject = JsonSerializer.Deserialize(jsonModel, oldType);
            object newJsonObject = JsonSerializer.Deserialize(jsonModel, newType);

            object oldXmlObject = SerializationHelper.Deserialize(xmlModel, oldType);
            object newXmlObject = SerializationHelper.Deserialize(xmlModel, newType);

            // They should all be the same, at least for the cases provided so far.
            newJsonObject.Should().BeEquivalentTo(oldJsonObject);
            newXmlObject.Should().BeEquivalentTo(oldXmlObject);
            newJsonObject.Should().BeEquivalentTo(newXmlObject);
        }

        private static Assembly CreateCSharpInstanceOldWay(string xsdResource, string org, string app, string modelName)
        {
            ModelMetadata modelMetadataOld = CreateMetamodelOldWay(xsdResource, org, app);
            string classesOldWay = GenerateCSharpClasses(modelMetadataOld);
            var instanceOldWay = CreateCSharpInstance(modelName, classesOldWay);
            Assembly assembly = Compiler.CompileToAssembly(classesOldWay);

            return assembly;
        }

        private static Assembly CreateCSharpInstanceNewWay(string xsdResource, string org, string app, string modelName)
        {
            ModelMetadata modelMetadataNew = CreateMetamodelNewWay(xsdResource, org, app);
            string classesNewWay = GenerateCSharpClasses(modelMetadataNew);
            var instanceNewWay = CreateCSharpInstance(modelName, classesNewWay);
            Assembly assembly = Compiler.CompileToAssembly(classesNewWay);

            return assembly;
        }

        private static object CreateCSharpInstance(string modelName, string classes)
        {
            Assembly assembly = Compiler.CompileToAssembly(classes);
            Type type = assembly.GetType(modelName);
            var modelInstance = assembly.CreateInstance(type.FullName);

            return modelInstance;
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
            Altinn.Studio.DataModeling.Json.Keywords.JsonSchemaKeywords.RegisterXsdKeywords();
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

        private JsonSchema2Metadata2CSharpTests ObjectDeserializedToTypeFromAssembly(string json)
        {
            _deserializedObjectFromAssemblyType = JsonSerializer.Deserialize(json, _typeFromAssembly);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests DeserializedObjectSerializedToStringWithManatee()
        {
            _serializedManateeObject = new Manatee.Json.Serialization.JsonSerializer().Serialize(_deserializedObjectFromAssemblyType).ToString();
            return this;
        }

        private JsonSchema2Metadata2CSharpTests LoadedJsonSchemaConvertedToXsdSchemaOld()
        {
            var jsonSchemaToXsd = new JsonSchemaToXsd();
            _xsdSchema = jsonSchemaToXsd.CreateXsd(_jsonSchema);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests XmlDeserializedToTypeFromAssembly(string xml)
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

        private JsonSchema2Metadata2CSharpTests DeserializedObjectFromAssemblyShouldBeEquivalentToDeserializedXmlObjectFromAssembly()
        {
            _deserializedObjectFromAssemblyType.Should().BeEquivalentTo(_deserializedXmlObject);
            return this;
        }

        private JsonSchema2Metadata2CSharpTests JsonSchemaShouldBeEquivalentWithExpected()
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

        private JsonSchema2Metadata2CSharpTests ModelInstanceObjectShouldBeEquivalentAsExpected()
        {
            _modelInstanceFromType.Should().BeEquivalentTo(_expectedInstanceFromType);
            return this;
        }

    }
}
