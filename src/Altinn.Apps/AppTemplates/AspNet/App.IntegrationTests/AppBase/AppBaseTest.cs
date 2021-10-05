using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;

using Newtonsoft.Json;

using Xunit;

namespace App.IntegrationTestsRef.AppBase
{
    public class AppBaseTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public AppBaseTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async void OnInstantiation_ProcessIsStarted()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");

            Instance instance = await CreateInstance("tdd", "endring-av-navn");

            // 1) Assert that process is started.
            Assert.NotNull(instance.Process);
            Assert.NotNull(instance.Process.Started);

            // 2) Get process state from instance (should be the same as returned in 1)
            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseC = await response.Content.ReadAsStringAsync();

            DeleteInstance(instance);

            response.EnsureSuccessStatusCode();

            ProcessState process = JsonConvert.DeserializeObject<ProcessState>(responseC);

            // check process state and that we are in Task_1
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(process.Started);
            Assert.NotNull(process.CurrentTask);
            Assert.Equal("Task_1", process.CurrentTask.ElementId);
        }

        [Fact]
        public async Task OnInstantiation_PresentationTextsAreSet()
        {
            // Arrange
            string org = "ttd";
            string app = "presentationfields-app";

            int expectedCount = 1;
            string expectedKey = "Title";
            string expectedValue = "Sophie Salt";

            // Act
            Instance instance = await CreateInstance(org, app);
            DeleteInstance(instance);

            // Assert
            Assert.NotNull(instance.PresentationTexts);
            Assert.Equal(expectedCount, instance.PresentationTexts.Count);
            Assert.True(instance.PresentationTexts.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instance.PresentationTexts[expectedKey]);
        }

        [Fact]
        public async Task OnInstantiation_DataValuesAreSet()
        {
            // Arrange
            string org = "ttd";
            string app = "datafields-app";

            int expectedCount = 1;
            string expectedKey = "Title";
            string expectedValue = "Sophie Salt";

            // Act
            Instance instance = await CreateInstance(org, app);
            DeleteInstance(instance);

            // Assert
            Assert.NotNull(instance.DataValues);
            Assert.Equal(expectedCount, instance.DataValues.Count);
            Assert.True(instance.DataValues.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instance.DataValues[expectedKey]);
        }

        [Fact]
        public async void OnTaskStart_DataElementIsCreated()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");

            Instance instance = await CreateInstance("tdd", "endring-av-navn");

            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance instanceWData = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(instanceWData.Data);

            DeleteInstance(instance);
        }

        [Fact]
        public async void OnTaskEnd_DataElementIsLocked()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");

            Instance instance = await CreateInstance("tdd", "endring-av-navn");

            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            DeleteInstance(instance);

            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.NotNull(processState.Ended);
        }

        [Fact]
        public async void OnTaskEnd_EFormidlingEnabled_AllMethodsImplemented()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "eformidling-app");

            Instance instance = await CreateInstance("ttd", "eformidling-app");

            string instancePath = $"/ttd/eformidling-app/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/completeProcess");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            DeleteInstance(instance);

            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.NotNull(processState.Ended);
        }

        [Fact]
        public async void OnTaskEnd_EFormidlingEnabled_GenerateMetadataNotImplemented()
        {
            string expected = "No method available for generating arkivmelding for eFormidling shipment.";
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "eformidling-app-invalid");

            Instance instance = await CreateInstance("ttd", "eformidling-app-invalid");

            string instancePath = $"/ttd/eformidling-app-invalid/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/completeProcess");

            try
            {
                await client.SendAsync(httpRequestMessage);
            }
            catch (Exception e)
            {
                Assert.Equal(expected, e.Message);
            }
            finally
            {
                DeleteInstance(instance);
            }
        }

        [Fact]
        public async void OnProcessEnd_InstanceIsArchived()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Instance instance = await CreateInstance("tdd", "endring-av-navn");
            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/completeProcess");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.NotNull(processState.Ended);

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}");
            response = await client.SendAsync(httpRequestMessage);

            Instance archivedInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(archivedInstance);
            Assert.NotNull(archivedInstance.Status.Archived);
            Assert.Null(archivedInstance.Status.HardDeleted);

            DeleteInstance(instance);
        }

        [Fact]
        public async void OnProcessEnd_InstanceIsArchivedAndHardDeleted()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "autodelete-true");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Instance instance = await CreateInstance("tdd", "autodelete-true");
            string instancePath = $"/tdd/autodelete-true/instances/{instance.Id}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/completeProcess");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.NotNull(processState.Ended);

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}");
            response = await client.SendAsync(httpRequestMessage);

            Instance archivedInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(archivedInstance);
            Assert.NotNull(archivedInstance.Status.Archived);
            Assert.NotNull(archivedInstance.Status.HardDeleted);

            DeleteInstance(instance);
        }

        private async Task<Instance> CreateInstance(string org, string app)
        {
            string token = PrincipalUtil.GetToken(1337);

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1337",
                },
                DueBefore = DateTime.Parse("2020-01-01"),
            };

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            StringContent content = new StringContent(instanceTemplate.ToString(), Encoding.UTF8);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/instances")
            {
                Content = content,
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Instance result = JsonConvert.DeserializeObject<Instance>(responseContent);

            return result;
        }

        private void DeleteInstance(Instance instance)
        {
            TestDataUtil.DeleteInstanceAndData(instance.Org, instance.AppId.Split("/")[1], int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(instance.Id.Split('/')[1]));
        }
    }
}
