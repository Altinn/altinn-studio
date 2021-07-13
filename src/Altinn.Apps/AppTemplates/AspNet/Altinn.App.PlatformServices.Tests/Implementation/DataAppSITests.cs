using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class DataAppSITests
    {
        private readonly Mock<IOptions<PlatformSettings>> platformSettingsOptions;
        private readonly Mock<IOptionsMonitor<AppSettings>> appSettingsOptions;
        private readonly Mock<IHttpContextAccessor> contextAccessor;
        private readonly Mock<ILogger<DataAppSI>> logger;

        public DataAppSITests()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            PlatformSettings platformSettings = new () { ApiStorageEndpoint = "http://localhost/" };
            platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

            appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
            AppSettings appSettings = new () { RuntimeCookieName = "AltinnStudioRuntime" };
            appSettingsOptions.Setup(s => s.CurrentValue).Returns(appSettings);

            contextAccessor = new Mock<IHttpContextAccessor>();
            contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

            logger = new Mock<ILogger<DataAppSI>>();
        }

        [Fact]
        public async Task InsertBinaryData_()
        {
            // Arrange
            HttpRequestMessage platformRequest = null;
            DelegatingHandlerStub delegatingHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                platformRequest = request;

                DataElement dataElement = new DataElement
                {
                    Id = "DataElement.Id",
                    InstanceGuid = "InstanceGuid"
                };
                return new HttpResponseMessage() { Content = JsonContent.Create(dataElement) };
            });

            Mock<IOptions<GeneralSettings>> generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            var target = new DataAppSI(
                platformSettingsOptions.Object,
                logger.Object,
                contextAccessor.Object,
                appSettingsOptions.Object,
                new HttpClient(delegatingHandler));

            var stream = new MemoryStream(Encoding.UTF8.GetBytes("This is not a pdf, but no one here will care."));

            // Act
            DataElement actual = await target.InsertBinaryData("instanceId", "catstories", "application/pdf", "a cats story.pdf", stream);

            // Assert
            Assert.NotNull(actual);

            Assert.NotNull(platformRequest);
            Assert.Equal(HttpMethod.Post, platformRequest.Method);
            Assert.EndsWith("dataType=catstories", platformRequest.RequestUri.ToString());
            Assert.Equal("\"a cats story.pdf\"", platformRequest.Content.Headers.ContentDisposition.FileName);
        }
    }
}
