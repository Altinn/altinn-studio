using System;
using System.Net;
using System.Net.Http;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.TestAttributes;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using SharedResources.Tests;
using Xunit;
using JsonSerializer = System.Text.Json.JsonSerializer;
using TextResource = Altinn.Studio.Designer.Models.TextResource;

namespace Designer.Tests.Controllers.PreviewController
{
    public class PreviewControllerTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.PreviewController, PreviewControllerTests>
    {
        private const string Org = "ttd";
        private const string App = "preview-app";
        private const string StatefulApp = "app-with-layoutsets";
        private const string Developer = "testUser";
        private const string LayoutSetName = "layoutSet1";
        private const string LayoutSetName2 = "layoutSet2";
        private const string PartyId = "51001";
        private const string InstanceGuId = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
        private const string AttachmentGuId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
        private const string MockedReferrerUrl = "https://studio-mock-url.no";
        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public PreviewControllerTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }





















































        [Fact]
        public async Task Get_Datamodel_Ok()
        {
            string expectedDatamodel = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/models/custom-dm-name.schema.json");

            string dataPathWithData = $"{Org}/{App}/api/jsonschema/custom-dm-name";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedDatamodel, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormLayouts_Ok()
        {
            string expectedFormLayout = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/ui/layouts/layout.json");
            string expectedFormLayouts = @"{""layout"": " + expectedFormLayout + "}";

            string dataPathWithData = $"{Org}/{App}/api/resource/FormLayout.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormLayouts, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormLayoutsForStatefulApp_Ok()
        {
            string expectedFormLayout1 = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, $"App/ui/{LayoutSetName}/layouts/layoutFile1InSet1.json");
            string expectedFormLayout2 = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, $"App/ui/{LayoutSetName}/layouts/layoutFile2InSet1.json");
            string expectedFormLayouts = "{\"layoutFile1InSet1\":" + expectedFormLayout1 + ",\"layoutFile2InSet1\":" + expectedFormLayout2 + "}";

            string dataPathWithData = $"{Org}/{StatefulApp}/api/layouts/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormLayouts, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_RuleHandler_NoContent()
        {
            string dataPathWithData = $"{Org}/{App}/api/resource/RuleHandler.js";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleHandlerForStatefulAppWithoutRuleHandler_NoContent()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/api/rulehandler/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleHandlerForStatefulAppWithRuleHandler_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/api/rulehandler/{LayoutSetName2}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleConfiguration_Ok()
        {
            string appwithRuleConfig = "app-without-layoutsets";
            string expectedRuleConfig = TestDataHelper.GetFileFromRepo(Org, appwithRuleConfig, Developer, "App/ui/RuleConfiguration.json");

            string dataPathWithData = $"{Org}/{appwithRuleConfig}/api/resource/RuleConfiguration.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedRuleConfig, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_RuleConfiguration_NoContent()
        {
            string dataPathWithData = $"{Org}/{App}/api/resource/RuleConfiguration.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleConfigurationForStatefulAppWithoutRuleConfig_NoContent()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/api/ruleconfiguration/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleConfigurationForStatefulAppWithRuleConfig_Ok()
        {
            string expectedRuleConfig = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, $"App/ui/{LayoutSetName2}/RuleConfiguration.json");

            string dataPathWithData = $"{Org}/{StatefulApp}/api/ruleconfiguration/{LayoutSetName2}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedRuleConfig, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_ApplicationLanguages_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/applicationlanguages";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal(@"[{""language"":""en""},{""language"":""nb""}]", responseBody);
        }

        [Fact]
        public async Task Get_Options_when_options_exists_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/options/test-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
            Assert.Equal(@"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]", responseStringWithoutWhitespaces);
        }

        [Fact]
        public async Task Get_Options_when_options_exists_for_stateful_app_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/options/test-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
            Assert.Equal(@"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]", responseStringWithoutWhitespaces);
        }

        [Fact]
        public async Task Get_Options_when_no_options_exist_returns_NoContent()
        {
            string dataPathWithData = $"{Org}/{App}/api/options/non-existing-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal("", responseBody);
        }
    }
}
