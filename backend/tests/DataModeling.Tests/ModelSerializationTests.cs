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

        private Type _modelType { get; set; }

        private string _jsonData { get; set; }
        private object _deserializedJsonModelObject { get; set; }
        private string _serializedModelJson { get; set; }

        private string _xmlData { get; set; }
        private object _deserializedXmlModelObject { get; set; }
        private string _serializedModelXml { get; set; }

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
            _modelType = CompiledAssembly.GetType(typeName);
            return this;
        }

        // Json helper methods
        private ModelSerializationTests JsonDataLoaded(string jsonPath)
        {
            _jsonData = SharedResourcesHelper.LoadTestDataAsString(jsonPath);
            return this;
        }

        private ModelSerializationTests JsonDataDeserializedToModelObject()
        {
            _deserializedJsonModelObject = JsonSerializer.Deserialize(_jsonData, _modelType);
            return this;
        }

        private ModelSerializationTests ModelObjectSerializedToJson()
        {
            _serializedModelJson = JsonSerializer.Serialize(_deserializedJsonModelObject);
            return this;
        }

        private void SerializedJsonData_ShouldNotBeChanged()
        {
            Assert.True(JsonUtils.DeepEquals(_serializedModelJson, _jsonData));
        }

        // Xml helper methods

        private ModelSerializationTests XmlDataLoaded(string xmlPath)
        {
            _xmlData = SharedResourcesHelper.LoadTestDataAsString(xmlPath);
            return this;
        }

        private ModelSerializationTests XmlDataDeserializedToModelObject()
        {
            _deserializedXmlModelObject = SerializationHelper.Deserialize(_xmlData, _modelType);
            return this;
        }

        private ModelSerializationTests ModelObjectSerializedToXml()
        {
            _serializedModelXml = SerializationHelper.SerializeXml(_deserializedXmlModelObject);
            return this;
        }

        private void SerializedXmlData_ShouldNotBeChanged()
        {
            var expected = XDocument.Parse(_serializedModelXml);
            var result = XDocument.Parse(_xmlData);
            Assert.True(XNode.DeepEquals(expected, result));
        }

        // Json and xml comparison helper methods

        private void ModelObjects_ShouldBeEquivalent()
        {
            Assert.True(JsonUtils.DeepEquals(JsonSerializer.Serialize(_deserializedJsonModelObject), JsonSerializer.Serialize(_deserializedXmlModelObject)));
        }
    }
}
