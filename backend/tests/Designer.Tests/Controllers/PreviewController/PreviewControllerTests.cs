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
    public class PreviewControllerTests : PreviewControllerTestsBase<PreviewControllerTests>
    {
        private const string Org = "ttd";
        private const string App = "preview-app";
        private const string StatefulApp = "app-with-layoutsets";
        private const string Developer = "testUser";
        private const string LayoutSetName = "layoutSet1";
        private const string LayoutSetName2 = "layoutSet2";
        private const string PartyId = "51001";
        private const string InstanceGuId = "f1e23d45-6789-1bcd-8c34-56789abcdef0";
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
        public async Task Get_PreviewStatus_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/preview/preview-status";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_ApplicationMetadata_Ok()
        {
            string expectedApplicationMetadata = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/config/applicationmetadata.json");

            string dataPathWithData = $"{Org}/{App}/api/v1/applicationmetadata";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string expectedJson = JsonSerializer.Serialize(JsonSerializer.Deserialize<Application>(expectedApplicationMetadata, _serializerOptions), _serializerOptions);
            JsonUtils.DeepEquals(expectedJson, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_ApplicationSettings_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/applicationsettings";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ApplicationSettings applicationSettings = JsonConvert.DeserializeObject<ApplicationSettings>(responseDocument.RootElement.ToString());
            Assert.Equal("ttd/preview-app", applicationSettings.Id);
            Assert.Equal("ttd", applicationSettings.Org);
            Assert.Equal("preview-app", applicationSettings.Title["nb"]);
        }

        [Fact]
        public async Task Get_LayoutSets_NotFound()
        {
            string dataPathWithData = $"{Org}/{App}/api/layoutsets";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_LayoutSettings_Ok()
        {
            string expectedLayoutSettings = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/ui/Settings.json");

            string dataPathWithData = $"{Org}/{App}/api/layoutsettings";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedLayoutSettings, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_LayoutSettingsForStatefulApps_Ok()
        {
            string expectedLayoutSettings = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, $"App/ui/{LayoutSetName}/Settings.json");

            string dataPathWithData = $"{Org}/{StatefulApp}/api/layoutsettings/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedLayoutSettings, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_Anonymous_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/data/anonymous";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals("{}", responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_KeepAlive_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/authentication/keepAlive";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_CurrentUser_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/profile/user";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            UserProfile currentUser = JsonConvert.DeserializeObject<UserProfile>(responseDocument.RootElement.ToString());
            Assert.Equal("previewUser", currentUser.UserName);
        }

        [Fact]
        public async Task Get_CurrentParty_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/authorization/parties/current";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Party currentParty = JsonConvert.DeserializeObject<Party>(responseDocument.RootElement.ToString());
            Assert.Equal(51001, currentParty.PartyId);
        }

        [Fact]
        public async Task Post_ValidateInstantiation_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/parties/validateInstantiation";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(@"{""valid"": true}", responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_Text_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/texts/nb";

            using HttpResponseMessage response = await HttpClient.Value.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            TextResource text = JsonConvert.DeserializeObject<TextResource>(responseDocument.RootElement.ToString());
            Assert.Equal("nb", text.Language);
        }

        [Fact]
        public async Task Post_Instance_Ok()
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(Org, App, Developer, targetRepository);

            string dataPathWithData = $"{Org}/{targetRepository}/instances?instanceOwnerPartyId=51001";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal("test-datatask-id", instance.Data[0].Id);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Post_InstanceForStatefulApp_Ok()
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(Org, StatefulApp, Developer, targetRepository);

            string dataPathWithData = $"{Org}/{targetRepository}/instances?instanceOwnerPartyId=51001";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal("test-datatask-id", instance.Data[0].Id);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_FormData_Ok()
        {
            string expectedFormData = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/models/custom-dm-name.schema.json");

            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormData, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormDataForAppWithoutDatamodel_Ok()
        {
            string dataPathWithData = $"{Org}/empty-app/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            responseBody.Should().Be($"{PartyId}/{InstanceGuId}");
        }

        [Fact]
        public async Task Get_FormDataForStatefulApp_Ok()
        {
            string expectedFormData = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, "App/models/datamodel.schema.json");

            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormData, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormDataForStatefulAppForTaskWithoutDatamodel_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName2}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            responseBody.Should().Be($"{PartyId}/{InstanceGuId}");
        }

        [Fact]
        public async Task Put_UpdateFormData_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task Get_Process_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/process";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_ProcessForStatefulApp_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/process";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_InstanceForNextProcess_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal($"{PartyId}/{InstanceGuId}", instance.Id);
            Assert.Equal("ttd", instance.Org);
        }

        [Fact]
        public async Task Get_InstanceForNextTaskForStatefulApp_Ok_TaskIsIncreased()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal($"{PartyId}/{InstanceGuId}", instance.Id);
            Assert.Equal("ttd", instance.Org);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_ProcessNext_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_ProcessNextForStatefulApp_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Put_ProcessNext_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal(@"{""ended"": ""ended""}", responseBody);
        }

        [Fact]
        public async Task Put_ProcessNextForStatefulAppForNonExistingTask_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"http://studio.localhost/designer/html/preview.html?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_TextResources_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/textresources";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            TextResource text = JsonConvert.DeserializeObject<TextResource>(responseDocument.RootElement.ToString());
            Assert.Equal("nb", text.Language);
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
