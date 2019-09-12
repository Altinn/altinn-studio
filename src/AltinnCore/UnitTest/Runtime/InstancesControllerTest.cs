using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Authentication.Constants;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.RestControllers;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Newtonsoft.Json;
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Tests the instances controller. Rest of runtime is mocked.
    /// </summary>
    public class InstancesControllerTest
    {
        private readonly string instanceOwnerId = "20000004";
        private readonly string userId = "44";
        private readonly string authenticationLevel = "1";
        private readonly string org = "test";
        private readonly string app = "app";

        /// <summary>
        /// Simulates an application owner's instanciation of an app with prefill.
        /// </summary>
        [Fact]
        public void PostInstanceWithInstanceJsonOnly()
        {          
            Instance instanceTemplate = new Instance()
            {
                DueDateTime = DateTime.Parse("2020-01-01"),
            };

            byte[] byteArray = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(instanceTemplate));
            MemoryStream instanceStream = new MemoryStream(byteArray);

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.ContentType).Returns("application/json");
            request.SetupGet(x => x.Body).Returns(instanceStream);
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns("220002");

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Instance actualInstance = new Instance()
            {
                InstanceOwnerId = instanceOwnerId,
                AppId = $"{org}/{app}",
                Org = $"{org}",
            };

            InstancesController controller = NewInstanceController(context);

            ActionResult<Instance> result = controller.Post(org, app, int.Parse(instanceOwnerId)).Result;

            Assert.IsType<CreatedResult>(result.Result);

            Instance instance = (Instance)((CreatedResult)result.Result).Value;

            Assert.NotNull(instance);
            Assert.Equal(instanceOwnerId, instance.InstanceOwnerId);
        }

        /// <summary>
        /// create a multipart request with instance, and xml prefil.
        /// </summary>
        [Fact]
        public async void PostInstanceWithXmlPrefill()
        {
            /* SETUP */

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = instanceOwnerId,
                DueDateTime = DateTime.Parse("2020-01-01"),
            };
            string instance = JsonConvert.SerializeObject(instanceTemplate);
            string xml = "<xml><is><no><good></good></no></is></xml>";

            MultipartFormDataContent formData = new MultipartFormDataContent()
            {
                { new StringContent(instance, Encoding.UTF8, "application/json"), "instance" },
                { new StringContent(xml, Encoding.UTF8, "application/xml"), "default" }
            };

            MemoryStream multipartStream = new MemoryStream();
            await formData.CopyToAsync(multipartStream);

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.ContentType).Returns("multipart/form-data");
            request.SetupGet(x => x.Body).Returns(multipartStream);
            request.SetupGet(x => x.Host).Returns(new HostString("tdd.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString("/tdd/test/instances/"));
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns("20002");

            Mock<ClaimsPrincipal> userMock = MockUser();

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.Setup(x => x.User).Returns(userMock.Object);

            InstancesController controller = NewInstanceController(context);

            /* TEST */

            ActionResult<Instance> actionResult = controller.Post(org, app, int.Parse(instanceOwnerId)).Result;

            Assert.IsType<CreatedResult>(actionResult.Result);
            Instance createdInstance = (Instance)((CreatedResult)actionResult.Result).Value;

            Assert.NotNull(createdInstance);
        }

        private InstancesController NewInstanceController(Mock<HttpContext> context)
        {
            Instance createdInstance = new Instance()
            {
                Id = $"{instanceOwnerId}/878761d7-06d0-43ee-98c7-c85f7997d696",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = $"{org}",
            };

            Mock<IAuthorization> authorizationService = new Mock<IAuthorization>();
            Mock<ILogger<InstancesController>> logger = new Mock<ILogger<InstancesController>>();
            Mock<IOptions<PlatformSettings>> platformSettings = new Mock<IOptions<PlatformSettings>>();

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>()))
                .Returns(Task.FromResult(createdInstance));

            Mock<IRegister> registerServiceMock = new Mock<IRegister>();
            registerServiceMock
                .Setup(x => x.GetParty(It.IsAny<int>()))
                .Returns(Task.FromResult(new Party() { PartyId = 20000 }));

            Mock<IProfile> profileServiceMock = new Mock<IProfile>();
            profileServiceMock
                .Setup(x => x.GetUserProfile(It.IsAny<int>()))
                .Returns(Task.FromResult(new UserProfile() { UserId = 44 }));

            Mock<IOptions<GeneralSettings>> generalSettingsMock = new Mock<IOptions<GeneralSettings>>();
            generalSettingsMock.Setup(s => s.Value).Returns(new GeneralSettings()
            {
                AltinnPartyCookieName = "AltinnPartyId",
            });

            Mock<IRepository> repositoryServiceMock = new Mock<IRepository>();
            Application application = JsonConvert.DeserializeObject<Application>(File.ReadAllText("Runtime/ServiceModels/default/Metadata/applicationmetadata.json"));
            repositoryServiceMock.Setup(r => r.GetApplication(org, app)).Returns(application);

            return new InstancesController(
                generalSettingsMock.Object,
                logger.Object,
                registerServiceMock.Object,
                instanceServiceMock.Object,
                new Mock<IData>().Object,
                new Mock<IExecution>().Object,
                profileServiceMock.Object,
                new Mock<IPlatformServices>().Object,
                new Mock<IInstanceEvent>().Object,
                repositoryServiceMock.Object)
            {
                ControllerContext = new ControllerContext()
                {
                    HttpContext = context.Object,
                },
            };
        }

        private Mock<IHttpClientAccessor> MockStorage()
        {
            Mock<HttpMessageHandler> storageMessageHandler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            storageMessageHandler
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage()
                {
                    StatusCode = System.Net.HttpStatusCode.OK,
                    Content = new StringContent(GetExpectedInstanceFromStorage()),
                })
                .Verifiable();

            HttpClient storageHttpClient = new HttpClient(storageMessageHandler.Object)
            {
                BaseAddress = new Uri("http://test/")
            };

            var httpClientAccessor = new Mock<IHttpClientAccessor>();
            httpClientAccessor.SetupGet(x => x.StorageClient).Returns(storageHttpClient);
            return httpClientAccessor;
        }
     
        private Mock<ClaimsPrincipal> MockUser()
        {
            string issuer = "https://altinn.no";
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId, ClaimValueTypes.Integer, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, authenticationLevel, ClaimValueTypes.Integer, issuer));

            var userMock = new Mock<ClaimsPrincipal>();
            userMock.Setup(p => p.Claims).Returns(claims);
            return userMock;
        }

        private string GetExpectedInstanceFromStorage()
        {
            return File.ReadAllText("Runtime/data/CreatedInstanceFromStorage.json");
        }
    }
}
