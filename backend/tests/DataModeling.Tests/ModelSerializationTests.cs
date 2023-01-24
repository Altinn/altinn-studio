using System;
using System.Xml.Linq;
using DataModeling.Tests.BaseClasses;
using FluentAssertions;
using SharedResources.Tests;
using Xunit;

namespace DataModeling.Tests
{
    public class ModelSerializationTests : CsharpModelConversionTestsBase<ModelSerializationTests>
    {

        private Type ModelType { get; set; }

        private string JsonData { get; set; }
        private object DeserializedModelObject { get; set; }
        private string SerializedModelJson { get; set; }

        [Theory]
        [InlineData("Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.json")]
        [InlineData("Model/XmlSchema/General/ReferenceArray.xsd", "Altinn.App.Models.Skjema", "Model/Json/General/ReferenceArray.json")]
        public void Round_DeserializeAndSerialize_To_ShouldNotChangeJsonData(string xsdSchemaPath, string typeName, string jsonPath)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.ConvertedJsonSchemaConvertedToModelMetadata()
                .And.ModelMetadataConvertedToCsharpClass()
                .And.CSharpClassesCompiledToAssembly()
                .Then
                .CompiledAssembly.Should().NotBeNull();

            And.When.TypeReadFromCompiledAssembly(typeName)
                .And.JsonDataLoaded(jsonPath)
                .And.JsonDataDeserializedToModelObject()
                .And.Then.ModelObjectSerializedToJson()
                .Then.SerializedJsonData_ShouldNotBeChanged();
        }


        private ModelSerializationTests TypeReadFromCompiledAssembly(string typeName)
        {
            ModelType = CompiledAssembly.GetType(typeName);
            return this;
        }

        private ModelSerializationTests JsonDataLoaded(string jsonPath)
        {
            JsonData = SharedResourcesHelper.LoadTestDataAsString(jsonPath);
            return this;
        }

        private ModelSerializationTests JsonDataDeserializedToModelObject()
        {
            DeserializedModelObject = System.Text.Json.JsonSerializer.Deserialize(JsonData, ModelType);
            return this;
        }

        private ModelSerializationTests ModelObjectSerializedToJson()
        {
            SerializedModelJson = System.Text.Json.JsonSerializer.Serialize(DeserializedModelObject);
            return this;
        }

        private void SerializedJsonData_ShouldNotBeChanged()
        {
            Newtonsoft.Json.Linq.JObject expected = ( Newtonsoft.Json.Linq.JObject )Newtonsoft.Json.JsonConvert.DeserializeObject( SerializedModelJson );
            Newtonsoft.Json.Linq.JObject result = ( Newtonsoft.Json.Linq.JObject )Newtonsoft.Json.JsonConvert.DeserializeObject( JsonData );
            Assert.True( Newtonsoft.Json.Linq.JToken.DeepEquals( result, expected ) );

        }
    }
}
