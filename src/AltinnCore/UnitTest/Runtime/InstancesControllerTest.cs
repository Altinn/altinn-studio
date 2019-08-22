using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Newtonsoft.Json;
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Tests the instances controller.
    /// </summary>
    public class InstancesControllerTest
    {
        private Mock<IAuthorization> authorizationService = new Mock<IAuthorization>();
        private Mock<ILogger<InstancesController>> logger = new Mock<ILogger<InstancesController>>();
        private Mock<IOptions<PlatformSettings>> platformSettings = new Mock<IOptions<PlatformSettings>>();

        /// <summary>
        /// Simulates an application owner's instanciation of an app with prefill.
        /// </summary>
        [Fact]
        public void PostInstanceWithInstanceJsonOnly()
        {
            Mock<IHttpClientAccessor> httpClientAccessor = MockStorage();

            Instance instanceTemplate = new Instance()
            {
                DueDateTime = DateTime.Parse("2020-01-01"),
            };

            byte[] byteArray = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(instanceTemplate));
            MemoryStream instanceStream = new MemoryStream(byteArray);

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.Body).Returns(instanceStream);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);

            InstancesController controller = new InstancesController(
                logger.Object,
                httpClientAccessor.Object,
                null,
                null)
            {
                ControllerContext = new ControllerContext()
                {
                    HttpContext = context.Object,
                },
            };

            ActionResult<Instance> result = controller.Post("test", "app", 20000004);

            Instance instance = (Instance)((CreatedResult)result.Result).Value;

            Assert.NotNull(instance);
            Assert.Equal("20000004", instance.InstanceOwnerId);
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

        /// <summary>
        /// create a multipart request with instance, and xml prefil.
        /// </summary>
        [Fact]
        public async void PostInstanceWithXmlPrefill()
        {
            Mock<IHttpClientAccessor> httpClientAccessor = MockStorage();

            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerId = "20000004",
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
            request.SetupGet(x => x.Body).Returns(multipartStream);
            request.SetupGet(x => x.Scheme).Returns("http");
            request.SetupGet(x => x.Host).Returns(new HostString("tdd.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString("/tdd/test/instances/"));

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);

            InstancesController controller = new InstancesController(
                logger.Object,
                httpClientAccessor.Object,
                null,
                null)
            {                
                ControllerContext = new ControllerContext()
                {
                    HttpContext = context.Object,                    
                },
            };

            ActionResult<Instance> actionResult = controller.Post("tdd", "apptest", null);

            Assert.IsType<CreatedResult>(actionResult.Result);
            Instance createdInstance = (Instance)((CreatedResult)actionResult.Result).Value;

            Assert.NotNull(createdInstance);
        }

        private string GetExpectedInstanceFromStorage()
        {
            return File.ReadAllText("Runtime/data/CreatedInstanceFromStorage.json");
        }
    }
}
