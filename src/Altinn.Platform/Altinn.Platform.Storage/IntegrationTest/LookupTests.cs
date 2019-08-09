using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Newtonsoft.Json;
using Storage.Interface.Clients;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// Tests to se if integration with Bridge works.
    /// </summary>
    public class LookupTests : IClassFixture<PlatformStorageFixture>
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private readonly InstanceClient storageClient;
        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Lookup tests
        /// </summary>
        /// <param name="fixture">the fixture to simulate system under test</param>
        public LookupTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.storageClient = new InstanceClient(this.client);
        }

        /// <summary>
        /// Check instance owner lookup.
        /// </summary>
        [Fact]
        public async void InstanceOwnerLookup()
        {
            string applicationId = "test/lookup";

            CreateTestApplication(applicationId);

            Instance instanceData = new Instance
            {
                AppId = applicationId,
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = "01025180093",
                },
            };

            string url = $"{versionPrefix}/instances?appId={applicationId}";

            HttpResponseMessage postResponse = await client.PostAsync(url, instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();

            string json = await postResponse.Content.ReadAsStringAsync();

            Instance instance = JsonConvert.DeserializeObject<Instance>(json);

            Assert.Equal("1", instance.InstanceOwnerId);            
        }

        [Fact]
        public async void InstanceLookupMocked()
        {            
            Mock<IInstanceRepository> mockInstanceRepository = new Mock<IInstanceRepository>();
            Mock<IApplicationRepository> mockApplicationRepository = new Mock<IApplicationRepository>();
            Mock<ILogger<InstancesController>> mockLogger = new Mock<ILogger<InstancesController>>();
            Mock<IOptions<GeneralSettings>> mockGeneralSettings = new Mock<IOptions<GeneralSettings>>();

            GeneralSettings settings = new GeneralSettings();
            settings.BridgeRegisterApiEndpoint = "http://test/";
            mockGeneralSettings.Setup(c => c.Value).Returns(settings);        

            Mock<HttpMessageHandler> handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage()
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("1001"),
                })
                .Verifiable();

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            InstancesController ic = new InstancesController(
                mockInstanceRepository.Object,
                mockApplicationRepository.Object,
                mockGeneralSettings.Object,
                mockLogger.Object,
                httpClient);

            Instance instance = new Instance()
            {
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = "1",
                }
            };

            ActionResult result = await ic.Post("test/appid", null, instance);
   
            string json = result.AsJson().ToString();

            Assert.NotNull(json);
        }

        private Application CreateTestApplication(string appId)
        {
            ApplicationClient appClient = new ApplicationClient(client);

            try
            {
                Application existingApp = appClient.GetApplication(appId);
                return existingApp;
            }
            catch (Exception)
            {
                // do nothing.
            }

            return appClient.CreateApplication(appId, null);
        }
    }
}
