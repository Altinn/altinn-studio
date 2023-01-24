using System;
using DataModeling.Tests.BaseClasses;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests
{
    public class RoundSerializationTests : CsharpModelConversionTestsBase<RoundSerializationTests>
    {

        private Type ModelType { get; set; }

        private object DeserializedModelObject { get; set; }
        private string SerializedModelJson { get; set; }

        [Theory]
        [InlineData("Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "{\"dataFormatProvider\":\"SERES\",\"dataFormatId\":\"5742\",\"dataFormatVersion\":\"34627\",\"Innrapportoer\":{\"geek\":{\"navn\":\"Ronny\",\"foedselsdato\":\"1971-11-02\",\"epost\":\"ronny.birkeli@gmail.com\"}},\"InnrapporterteData\":{\"geekType\":\"backend\",\"altinnErfaringAAr\":0}}")]
        [InlineData("Model/XmlSchema/General/ReferenceArray.xsd", "Altinn.App.Models.Skjema", "{\"melding\":{\"name\":\"testName\",\"tags\":\"testTags\",\"simple_list\":{\"simple_keyvalues\":[{\"key\":\"test\",\"doubleValue\":2.1,\"intValue\":2},{\"key\":\"test2\",\"doubleValue\":3.1,\"intValue\":3}]},\"toggle\":true}}")]
        public void Round_DeserializeAndSerialize_To_ShouldNotChangeJsonData(string xsdSchemaPath, string typeName, string json)
        {
            Given.That.XsdSchemaLoaded(xsdSchemaPath)
                .When.LoadedXsdSchemaConvertedToJsonSchema()
                .And.ConvertedJsonSchemaConvertedToModelMetadata()
                .And.ModelMetadataConvertedToCsharpClass()
                .And.CSharpClassesCompiledToAssembly()
                .Then
                .CompiledAssembly.Should().NotBeNull();

            And.When.TypeReadFromCompiledAssembly(typeName)
                .And.JsonDeserializedToModelObject(json)
                .And.Then.ModelObjectSerializedToJson()
                .Then.SerializedJsonData_ShouldNotBeChanged(json);
        }


        private RoundSerializationTests TypeReadFromCompiledAssembly(string typeName)
        {
            ModelType = CompiledAssembly.GetType(typeName);
            return this;
        }

        private RoundSerializationTests JsonDeserializedToModelObject(string json)
        {
            DeserializedModelObject = System.Text.Json.JsonSerializer.Deserialize(json, ModelType);
            return this;
        }

        private RoundSerializationTests ModelObjectSerializedToJson()
        {
            SerializedModelJson = System.Text.Json.JsonSerializer.Serialize(DeserializedModelObject);
            return this;
        }

        private void SerializedJsonData_ShouldNotBeChanged(string json)
        {
            Newtonsoft.Json.Linq.JObject expected = ( Newtonsoft.Json.Linq.JObject )Newtonsoft.Json.JsonConvert.DeserializeObject( SerializedModelJson );
            Newtonsoft.Json.Linq.JObject result = ( Newtonsoft.Json.Linq.JObject )Newtonsoft.Json.JsonConvert.DeserializeObject( json );
            Assert.True( Newtonsoft.Json.Linq.JToken.DeepEquals( result, expected ) );

        }
    }
}
