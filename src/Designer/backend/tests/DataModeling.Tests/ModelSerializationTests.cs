using System;
using System.Xml.Linq;
using DataModeling.Tests.BaseClasses;
using DataModeling.Tests.TestDataClasses;
using DataModeling.Tests.Utils;
using SharedResources.Tests;
using Xunit;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace DataModeling.Tests
{
    public class ModelSerializationTests : CsharpModelConversionTestsBase<ModelSerializationTests>
    {

        private Type ModelType { get; set; }

        private string JsonData { get; set; }
        private object DeserializedJsonModelObject { get; set; }
        private string SerializedModelJson { get; set; }

        private string XmlData { get; set; }
        private object DeserializedXmlModelObject { get; set; }
        private string SerializedModelXml { get; set; }

        [Theory]
        [ClassData(typeof(JsonRoundSerializationTestData))]
        public void Round_DeserializeAndSerialize_To_ShouldNotChangeJsonData(string xsdSchemaPath, string typeName, string jsonPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.ConvertedJsonSchemaConvertedToModelMetadata()
                .And.ModelMetadataConvertedToCsharpClass()
                .And.CSharpClassesCompiledToAssembly();

            Assert.NotNull(CompiledAssembly);

            And.When.TypeReadFromCompiledAssembly(typeName)
                .And.JsonDataLoaded(jsonPath)
                .And.JsonDataDeserializedToModelObject()
                .And.Then.ModelObjectSerializedToJson()
                .Then.SerializedJsonData_ShouldNotBeChanged();
        }

        [Theory]
        [ClassData(typeof(XmlRoundSerializationTestData))]
        public void Round_DeserializeAndSerialize_To_ShouldNotChangeXmlData(string xsdSchemaPath, string typeName, string jsonPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.ConvertedJsonSchemaConvertedToModelMetadata()
                .And.ModelMetadataConvertedToCsharpClass()
                .And.CSharpClassesCompiledToAssembly();

            Assert.NotNull(CompiledAssembly);

            And.When.TypeReadFromCompiledAssembly(typeName)
                .And.XmlDataLoaded(jsonPath)
                .And.XmlDataDeserializedToModelObject()
                .And.Then.ModelObjectSerializedToXml()
                .Then.SerializedXmlData_ShouldNotBeChanged();
        }

        [Theory]
        [ClassData(typeof(JsonAndXmlDeserializationComparisonTestData))]
        public void XmlAndJsonData_ShouldDeserialize_ToEquivalentModel(string xsdSchemaPath, string typeName, string jsonPath, string xmlPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.ConvertedJsonSchemaConvertedToModelMetadata()
                .And.ModelMetadataConvertedToCsharpClass()
                .And.CSharpClassesCompiledToAssembly();

            Assert.NotNull(CompiledAssembly);

            And.When.TypeReadFromCompiledAssembly(typeName)
                .And.XmlDataLoaded(xmlPath)
                .And.JsonDataLoaded(jsonPath)
                .And.XmlDataDeserializedToModelObject()
                .And.JsonDataDeserializedToModelObject()
                .Then.ModelObjects_ShouldBeEquivalent();
        }


        private ModelSerializationTests TypeReadFromCompiledAssembly(string typeName)
        {
            ModelType = CompiledAssembly.GetType(typeName);
            return this;
        }

        // Json helper methods
        private ModelSerializationTests JsonDataLoaded(string jsonPath)
        {
            JsonData = SharedResourcesHelper.LoadTestDataAsString(jsonPath);
            return this;
        }

        private ModelSerializationTests JsonDataDeserializedToModelObject()
        {
            DeserializedJsonModelObject = JsonSerializer.Deserialize(JsonData, ModelType);
            return this;
        }

        private ModelSerializationTests ModelObjectSerializedToJson()
        {
            SerializedModelJson = JsonSerializer.Serialize(DeserializedJsonModelObject);
            return this;
        }

        private void SerializedJsonData_ShouldNotBeChanged()
        {
            Assert.True(JsonUtils.DeepEquals(SerializedModelJson, JsonData));
        }

        // Xml helper methods

        private ModelSerializationTests XmlDataLoaded(string xmlPath)
        {
            XmlData = SharedResourcesHelper.LoadTestDataAsString(xmlPath);
            return this;
        }

        private ModelSerializationTests XmlDataDeserializedToModelObject()
        {
            DeserializedXmlModelObject = SerializationHelper.Deserialize(XmlData, ModelType);
            return this;
        }

        private ModelSerializationTests ModelObjectSerializedToXml()
        {
            SerializedModelXml = SerializationHelper.SerializeXml(DeserializedXmlModelObject);
            return this;
        }

        private void SerializedXmlData_ShouldNotBeChanged()
        {
            var expected = XDocument.Parse(SerializedModelXml);
            var result = XDocument.Parse(XmlData);
            Assert.True(XNode.DeepEquals(expected, result));
        }

        // Json and xml comparison helper methods

        private void ModelObjects_ShouldBeEquivalent()
        {
            Assert.True(JsonUtils.DeepEquals(JsonSerializer.Serialize(DeserializedJsonModelObject), JsonSerializer.Serialize(DeserializedXmlModelObject)));
        }
    }
}
