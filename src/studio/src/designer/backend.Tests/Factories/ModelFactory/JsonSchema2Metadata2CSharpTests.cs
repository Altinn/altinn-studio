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
using XmlSchemaValidator = Designer.Tests.Utils.XmlSchemaValidator;

namespace Designer.Tests.Factories.ModelFactory
{
    public class JsonSchema2Metadata2CSharpTests
    {
        private readonly ITestOutputHelper _outputHelper;

        public JsonSchema2Metadata2CSharpTests(ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;            
        }

        [Fact]
        public async Task InlineSchema_ShouldSerializeToCSharp()
        {
            var org = "yabbin";
            var app = "datamodelling";
            var jsonSchemaString = @"{""properties"":{""melding"":{""properties"":{""test"":{""type"":""object"",""properties"":{""navn"":{""type"":""string""}}}},""type"":""object""}},""definitions"":{}, ""required"": [""melding""]}";
            
            JsonSchema jsonSchema = await ParseJsonSchema(jsonSchemaString);
            ModelMetadata modelMetadata = GenerateModelMetadata(org, app, jsonSchema);
            string classes = GenerateCSharpClasses(modelMetadata);
                        
            Assembly assembly = Compiler.CompileToAssembly(classes);            
            
            Type type = assembly.GetType("Altinn.App.Models.melding");

            // Make sure the JSON can be serialized into the generated C# class
            // var json = @"{""melding"":{""test"":{""navn"":""Ronny""}}}";
            var json = @"{""test"":{""navn"":""Ronny""}}";            
            object jsonObj = JsonSerializer.Deserialize(json, type);

            // Make sure the serialized JSON equals what we expect
            var jsonSerialized = new Manatee.Json.Serialization.JsonSerializer().Serialize(jsonObj);
            Assert.Equal(json, jsonSerialized.ToString());

            // Make sure the serialized JSON validates
            var jsonValidationResult = jsonSchema.Validate(new JsonValue(jsonSerialized.ToString()));
            Assert.True(jsonValidationResult.IsValid);

            // Validate JSON against JSON Schema (Manatee seems to think this is fine, but it's not ref. https://www.jsonschemavalidator.net/).                        
            jsonValidationResult = jsonSchema.Validate(new JsonValue(json), new JsonSchemaOptions() { });
            Assert.True(jsonValidationResult.IsValid);

            // Make sure the xml can be deserialized
            var xml = "<melding><test><navn>Ronny</navn></test></melding>";            
            object xmlObj = SerializationHelper.Deserialize(xml, type);

            // Validate XML against generated XSD
            // OBS! On inline schemas the generated XSD only adds the root node, and does not traverse the properties.
            // This should be handled in the new XSD generator.
            JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();
            XmlSchema xmlSchema = jsonSchemaToXsd.CreateXsd(jsonSchema);
            var xmlSchemaValidator = new XmlSchemaValidator(xmlSchema);
            Assert.True(xmlSchemaValidator.Validate(xml));

            // Do a deep compare, property by property, value by value
            jsonObj.Should().Equals(xmlObj);
        }

        // TODO: This is the one that should work
        // [InlineData("Designer.Tests._TestData.Model.JsonSchema.hvem-er-hvem.json", "Altinn.App.Models.HvemErHvem_M", "{\"melding\":{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"RonnyBirkeli\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        [Theory]
        [InlineData("Designer.Tests._TestData.Model.JsonSchema.hvem-er-hvem.json", "Altinn.App.Models.HvemErHvem_M", "{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"RonnyBirkeli\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        public void SeresSchema_ShouldSerializeToCSharp(string resourceName, string modelName, string json, string xml)
        {
            var org = "yabbin";
            var app = "hvem-er-hvem";
                        
            JsonSchema jsonSchema = TestDataHelper.LoadDataFromEmbeddedResourceAsJsonSchema(resourceName);
            ModelMetadata modelMetadata = GenerateModelMetadata(org, app, jsonSchema);
            string classes = GenerateCSharpClasses(modelMetadata);

            Assembly assembly = Compiler.CompileToAssembly(classes);

            Type type = assembly.GetType(modelName);

            // Make sure the JSON can be serialized into the generated C# class
            object jsonObj = JsonSerializer.Deserialize(json, type);

            // Make sure the serialized JSON equals what we expect            
            var jsonSerialized = new Manatee.Json.Serialization.JsonSerializer().Serialize(jsonObj);
            Assert.Equal(json, jsonSerialized.ToString());

            // Make sure the serialized JSON validates
            // Manatee fails on this, but not https://www.jsonschemavalidator.net/
            // var jsonValidationResult = jsonSchema.Validate(new JsonValue(jsonSerialized.ToString()));
            // Assert.True(jsonValidationResult.IsValid);

            // Validate JSON against JSON Schema (Manatee seems to think this is fine, but it's not ref. https://www.jsonschemavalidator.net/).                        
            // jsonValidationResult = jsonSchema.Validate(new JsonValue(json), new JsonSchemaOptions() { });
            // Assert.True(jsonValidationResult.IsValid);

            // Make sure the xml can be deserialized                        
            object xmlObj = SerializationHelper.Deserialize(xml, type);

            // Validate XML against generated XSD
            // OBS! On inline schemas the generated XSD only adds the root node, and does not traverse the properties.
            // This should be handled in the new XSD generator.
            JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();
            XmlSchema xmlSchema = jsonSchemaToXsd.CreateXsd(jsonSchema);
            var xmlSchemaValidator = new XmlSchemaValidator(xmlSchema);
            Assert.True(xmlSchemaValidator.Validate(xml));

            // Do a deep compare, property by property, value by value
            jsonObj.Should().Equals(xmlObj);
        }

        [Theory]
        [InlineData("Designer.Tests._TestData.Model.Xsd.or-melding-2-12186.xsd", "Altinn.App.Models.Skjema", "Designer.Tests._TestData.Model.JsonSchema.or-melding-2-12186.expected.schema.json", "Designer.Tests._TestData.Model.CSharp.or-melding-2-12186.expected.csharp.txt")]
        [InlineData("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "Designer.Tests._TestData.Model.JsonSchema.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.expected.schema.json", "Designer.Tests._TestData.Model.CSharp.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.expected.csharp.txt")]
        public void SeresOrXmlSchema_ShouldSerializeToCSharp(string xsdResource, string modelName, string expectedJsonSchemaResource, string expectedCSharpResource)
        {
            var org = "yabbin";
            var app = "hvem-er-hvem";

            Stream xsdStream = TestDataHelper.LoadDataFromEmbeddedResource(xsdResource);
            XmlReader xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });

            // Compare generated JSON Schema
            XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader);
            JsonSchema jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

            var expectedJsonSchema = TestDataHelper.LoadDataFromEmbeddedResourceAsJsonSchema(expectedJsonSchemaResource);

            expectedJsonSchema.Should().Equals(jsonSchema);

            // Compare generated C# classes
            ModelMetadata modelMetadata = GenerateModelMetadata(org, app, jsonSchema);

            string classes = GenerateCSharpClasses(modelMetadata);
            Assembly assembly = Compiler.CompileToAssembly(classes);
            Type type = assembly.GetType(modelName);
            var modelInstance = assembly.CreateInstance(type.FullName);

            string expectedClasses = TestDataHelper.LoadDataFromEmbeddedResourceAsString(expectedCSharpResource);
            Assembly expectedAssembly = Compiler.CompileToAssembly(expectedClasses);
            Type expectedType = expectedAssembly.GetType(modelName);
            var expectedModelInstance = expectedAssembly.CreateInstance(expectedType.FullName);
            expectedType.HasSameMetadataDefinitionAs(type);

            modelInstance.Should().BeEquivalentTo(expectedModelInstance);
            type.Should().BeDecoratedWith<XmlRootAttribute>();            
        }

        [Theory]
        [InlineData("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}", "<?xml version=\"1.0\"?><melding xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" dataFormatProvider=\"SERES\" dataFormatId=\"5742\" dataFormatVersion=\"34627\"><Innrapportoer><geek><navn>Ronny</navn><foedselsdato>1971-11-02</foedselsdato><epost>ronny.birkeli@gmail.com</epost></geek></Innrapportoer><InnrapporterteData><geekType>backend</geekType><altinnErfaringAAr>0</altinnErfaringAAr></InnrapporterteData></melding>")]
        public void XSD_ConvertToCSharp_NewAndOldShouldResultInSameCSharp(string xsdResource, string modelName, string jsonModel, string xmlModel)
        {
            JsonSchemaKeywords.RegisterXsdKeywords();
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
    }
}
