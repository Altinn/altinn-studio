using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Models;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Models
{
    public class FormLayoutSerializationTests : FluentTestsBase<FormLayoutSerializationTests>
    {
        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private string LoadedFromLayoutContent { get; set; }
        private FormLayout FormLayoutObject { get; set; }
        private string SerializedFormLayoutContent { get; set; }



        [Theory]
        [InlineData("FormLayout/layoutWithUnknownProperties.json")]
        public void Deserialize_And_Serialize_ShouldProduceSameJson(string formLayoutPath)
        {
            Given.That.FormLayoutContentLoaded(formLayoutPath)
                .When.FormLayoutContentDeserialized()
                .And.FormLayoutObjectSerializedToJson()
                .Then.SerializedFormLayoutJsonShouldBeEquivalentToOriginalContent();

        }
        private FormLayoutSerializationTests FormLayoutContentLoaded(string formLayoutPath)
        {
            LoadedFromLayoutContent = SharedResourcesHelper.LoadTestDataAsString(formLayoutPath);
            return this;
        }

        private FormLayoutSerializationTests FormLayoutContentDeserialized()
        {
            FormLayoutObject = JsonSerializer.Deserialize<FormLayout>(LoadedFromLayoutContent, _serializerOptions);
            return this;
        }

        private FormLayoutSerializationTests FormLayoutObjectSerializedToJson()
        {
            SerializedFormLayoutContent = JsonSerializer.Serialize(FormLayoutObject, _serializerOptions);
            return this;
        }

        // Using only newtonsoft.json for deep comparison of json since there is no equivalent functionality in System.Text.Json
        // Serialization is done using System.Text.Json
        private void SerializedFormLayoutJsonShouldBeEquivalentToOriginalContent()
        {
            Newtonsoft.Json.Linq.JObject result = (Newtonsoft.Json.Linq.JObject)Newtonsoft.Json.JsonConvert.DeserializeObject(LoadedFromLayoutContent);
            Newtonsoft.Json.Linq.JObject expected = (Newtonsoft.Json.Linq.JObject)Newtonsoft.Json.JsonConvert.DeserializeObject(SerializedFormLayoutContent);
            Assert.True(Newtonsoft.Json.Linq.JToken.DeepEquals(expected, result));
        }


    }
}
