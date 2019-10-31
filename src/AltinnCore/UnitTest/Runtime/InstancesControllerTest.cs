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
using AltinnCoreServiceImplementation.tdd.xyz23;
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
        private readonly Guid dataGuid = Guid.Parse("16b62641-67b1-4cf0-b26f-61279fbf528d");

        /// <summary>
        /// Create an instance with only instanceownerId in query param.
        /// </summary>
        [Fact]
        public void PostInstanceWithInstanceOwnerIdInQueryParam()
        {
            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.Host).Returns(new HostString("tdd.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString("/tdd/test/instances/"));
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns(instanceOwnerId);

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
            Assert.StartsWith($"https://tdd.apps.at21.altinn.cloud/tdd/test/instances/{instanceOwnerId}", instance.SelfLinks.Apps);
        }

        /// <summary>
        /// Simulates an organisation's instanciation of an app with prefill.
        /// </summary>
        [Fact]
        public void PostInstanceWithInstanceTemplateAsJson()
        {          
            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = instanceOwnerId,
                DueDateTime = DateTime.Parse("2020-01-01"),
            };

            byte[] byteArray = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(instanceTemplate));
            MemoryStream instanceStream = new MemoryStream(byteArray);

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.ContentType).Returns("application/json");
            request.SetupGet(x => x.Body).Returns(instanceStream);
            request.SetupGet(x => x.Host).Returns(new HostString("tdd.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString("/tdd/test/instances/"));
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns(instanceOwnerId);

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
            
            ActionResult<Instance> result = controller.Post(org, app, null).Result;               

            Assert.IsType<CreatedResult>(result.Result);

            Instance instance = (Instance)((CreatedResult)result.Result).Value;

            Assert.NotNull(instance);
            Assert.Equal(instanceOwnerId, instance.InstanceOwnerId);
            Assert.StartsWith($"https://tdd.apps.at21.altinn.cloud/tdd/test/instances/{instanceOwnerId}", instance.SelfLinks.Apps);
        }

        /// <summary>
        /// create a multipart request with instance, and xml prefil.
        /// </summary>
        [Fact]
        public async void PostInstanceWithInstanceTemplateAndXmlPrefill()
        {
            /* SETUP */

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = instanceOwnerId,
                DueDateTime = DateTime.Parse("2020-01-01"),
            };
            string instance = JsonConvert.SerializeObject(instanceTemplate);
            string xml = File.ReadAllText("Runtime/data/data-element.xml");

            string boundary = "abcdefgh";
            MultipartFormDataContent formData = new MultipartFormDataContent(boundary)
            {
                { new StringContent(instance, Encoding.UTF8, "application/json"), "instance" },
                { new StringContent(xml, Encoding.UTF8, "application/xml"), "default" }
            };

            MemoryStream multipartStream = new MemoryStream();
            await formData.CopyToAsync(multipartStream);
            multipartStream.Position = 0;

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.ContentType).Returns($"multipart/form-data; boundary={boundary}");
            request.SetupGet(x => x.Body).Returns(multipartStream);
            request.SetupGet(x => x.Host).Returns(new HostString("tdd.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString("/tdd/test/instances/"));
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns(instanceOwnerId);

            Mock<ClaimsPrincipal> userMock = MockUser();

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.Setup(x => x.User).Returns(userMock.Object);

            InstancesController controller = NewInstanceController(context);

            /* TEST */

            ActionResult<Instance> actionResult = controller.Post(org, app, null).Result;

            Assert.IsType<CreatedResult>(actionResult.Result);
            Instance createdInstance = (Instance)((CreatedResult)actionResult.Result).Value;

            Assert.NotNull(createdInstance);
            Assert.Single(createdInstance.Data);
            Assert.Equal("default", createdInstance.Data[0].ElementType);
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

            Instance instanceWithData = new Instance()
            {
                Id = createdInstance.Id,
                InstanceOwnerId = createdInstance.InstanceOwnerId,
                AppId = createdInstance.AppId,
                Org = createdInstance.Org,
                Data = new List<DataElement>()
                {
                    new DataElement()
                    {
                        Id = dataGuid.ToString(),
                        ElementType = "default",
                    }
                }
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
                .Returns(Task.FromResult(new Party() { PartyId = int.Parse(instanceOwnerId) }));

            Mock<IProfile> profileServiceMock = new Mock<IProfile>();
            profileServiceMock
                .Setup(x => x.GetUserProfile(It.IsAny<int>()))
                .Returns(Task.FromResult(new UserProfile() { UserId = int.Parse(userId) }));

            Mock<IOptions<GeneralSettings>> generalSettingsMock = new Mock<IOptions<GeneralSettings>>();
            generalSettingsMock.Setup(s => s.Value).Returns(new GeneralSettings()
            {
                AltinnPartyCookieName = "AltinnPartyId",
            });

            Mock<ServiceContext> serviceContextMock = new Mock<ServiceContext>();
            Mock<IExecution> executionServiceMock = new Mock<IExecution>();
            executionServiceMock
                .Setup(e => e.GetServiceContext(org, app, It.IsAny<bool>()))
                .Returns(serviceContextMock.Object);

            ServiceImplementation serviceImplementation = new ServiceImplementation();
            executionServiceMock
                .Setup(e => e.GetServiceImplementation(org, app, It.IsAny<bool>()))
                .Returns(serviceImplementation);

            Mock<IRepository> repositoryServiceMock = new Mock<IRepository>();
            Application application = JsonConvert.DeserializeObject<Application>(File.ReadAllText("Runtime/ServiceModels/default/Metadata/applicationmetadata.json"));
            repositoryServiceMock.Setup(r => r.GetApplication(org, app)).Returns(application);

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.InsertFormData(It.IsAny<object>(), It.IsAny<Guid>(), It.IsAny<Type>(), org, app, It.IsAny<int>()))
                .Returns(Task.FromResult(instanceWithData));
            
            return new InstancesController(
                generalSettingsMock.Object,
                logger.Object,
                registerServiceMock.Object,
                instanceServiceMock.Object,
                dataServiceMock.Object,
                executionServiceMock.Object,
                profileServiceMock.Object,
                new Mock<IPlatformServices>().Object,
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
