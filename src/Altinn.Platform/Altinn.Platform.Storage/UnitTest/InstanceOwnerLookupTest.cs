using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Storage.UnitTests
{
    public class InstanceOwnerLookupTest
    {
        Instance createdInstance;
        InstancesController instanceController;

        public InstanceOwnerLookupTest()
        {            
        }

        [Fact]
        public async void InstanceLookupTest()
        {
            PrepareMock(HttpStatusCode.OK, "1001");

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = "1",
                }
            };

            ActionResult result = await instanceController.Post("test/appid", null, instanceTemplate);

            OkObjectResult okresult = result as OkObjectResult;

            Instance resultInstance = (Instance)okresult.Value;

            Assert.NotNull(resultInstance);
            Assert.Equal(createdInstance.Id, resultInstance.Id);
            Assert.Null(resultInstance.InstanceOwnerLookup);
        }

        [Fact]
        public async void InstanceLookupFails()
        {
            PrepareMock(HttpStatusCode.BadRequest, "fails");

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = "unknown"
                }
            };

            ActionResult result = await instanceController.Post("test/appid", null, instanceTemplate);

            BadRequestObjectResult badResult = result as BadRequestObjectResult;

            Assert.NotNull(badResult);
        }

        private void PrepareMock(HttpStatusCode code, string contentToReturn)
        {
            createdInstance = new Instance()
            {
                Id = "1001/5650b227-5f79-41d8-a901-abed492c6fd4",
                AppId = "test/lookup",
                Org = "test"
            };
            Mock<IInstanceRepository> mockInstanceRepository = new Mock<IInstanceRepository>();
            mockInstanceRepository.Setup(ir => ir.Create(It.IsAny<Instance>())).Returns(Task.FromResult(createdInstance));
            Mock<IApplicationRepository> mockApplicationRepository = new Mock<IApplicationRepository>();

            mockApplicationRepository.Setup(ar => ar.FindOne(It.IsAny<string>(), It.IsAny<string>())).Returns(
                Task.FromResult(new Application()
                {
                    Id = "test/lookup",
                    Org = "test",
                }));

            Mock<ILogger<InstancesController>> mockLogger = new Mock<ILogger<InstancesController>>();
            Mock<IOptions<GeneralSettings>> mockGeneralSettings = new Mock<IOptions<GeneralSettings>>();

            GeneralSettings settings = new GeneralSettings
            {
                BridgeRegisterApiEndpoint = "http://test/"
            };
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
                    StatusCode = code,
                    Content = new StringContent(contentToReturn),
                })
                .Verifiable();

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            instanceController = new InstancesController(
                mockInstanceRepository.Object,
                mockApplicationRepository.Object,
                mockGeneralSettings.Object,
                mockLogger.Object,
                httpClient);
        }
    }
}
