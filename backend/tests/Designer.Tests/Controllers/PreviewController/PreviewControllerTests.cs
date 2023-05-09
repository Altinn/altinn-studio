using System.Net;
using System.Net.Http;
using System.Text.Json;
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
using TextResource = Altinn.Studio.Designer.Models.TextResource;

namespace Designer.Tests.Controllers.PreviewController
{
    public class PreviewControllerTests : PreviewControllerTestsBase<PreviewControllerTests>
    {
        private const string Org = "ttd";
        private const string App = "preview-app";
        private const string Developer = "testUser";

        public PreviewControllerTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetPreviewStatus_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/preview/preview-status";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task GetApplicationMetadata_Ok()
        {
            string expectedApplicationMetadata = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/config/applicationmetadata.json");

            string dataPathWithData = $"{Org}/{App}/api/v1/applicationmetadata";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedApplicationMetadata, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task GetApplicationSettings_Ok()
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
        public async Task GetLayoutSets_NotFound()
        {
            string dataPathWithData = $"{Org}/{App}/api/layoutsets";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
        }

        [Fact]
        public async Task GetLayoutSettings_Ok()
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
        public async Task GetAnonymous_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/data/anonymous";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals("{}", responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task GetKeepAlive_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/authentication/keepAlive";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task GetCurrentUser_Ok()
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
        public async Task GetCurrentParty_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/authorization/parties/current";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Party currentParty = JsonConvert.DeserializeObject<Party>(responseDocument.RootElement.ToString());
            Assert.Equal(1, currentParty.PartyId);
        }

        [Fact]
        public async Task PostValidateInstantiation_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/parties/validateInstantiation";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(@"{""valid"": true}", responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task GetText_Ok()
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
        public async Task PostInstance_Ok()
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(Org, App, Developer, targetRepository);

            string dataPathWithData = $"{Org}/{targetRepository}/instances";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal("test-datatask-id", instance.Data[0].Id);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
        }

        [Fact]
        public async Task GetFormData_Ok()
        {
            string expectedFormData = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/models/custom-dm-name.schema.json");

            string dataPathWithData = $"{Org}/{App}/instances/1/test-id/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormData, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task UpdateFormData_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/undefined/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Fact]
        public async Task GetProcess_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/undefined/process";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task GetProcessNext_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/instances/undefined/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task GetTextResources_Ok()
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
        public async Task GetDatamodel_Ok()
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
        public async Task GetFormLayouts_Ok()
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
        public async Task GetRuleHandler_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/resource/RuleHandler.js";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
        }

        [Fact]
        public async Task GetRuleConfiguration_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/resource/RuleConfiguration.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status204NoContent, (int)response.StatusCode);
        }

        [Fact]
        public async Task GetApplicationLanguages_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/applicationlanguages";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal(@"[{""language"":""en""},{""language"":""nb""}]", responseBody);
        }

        [Fact]
        public async Task GetOptions_when_options_exists_Ok()
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
        public async Task GetOptions_when_no_options_exist_returns_NoContent()
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
