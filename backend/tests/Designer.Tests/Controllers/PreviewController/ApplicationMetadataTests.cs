using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ApplicationMetadataTests : PreviewControllerTestsBase<ApplicationMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        private readonly Mock<IAppDevelopmentService> _appDevelopmentServiceMock;
        public ApplicationMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
            _appDevelopmentServiceMock = new Mock<IAppDevelopmentService>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton(_appDevelopmentServiceMock.Object);
        }

        [Fact]
        public async Task Get_ApplicationMetadata_Ok()
        {
            string expectedApplicationMetadataString = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/config/applicationmetadata.json");
            _appDevelopmentServiceMock
                .Setup(rs => rs.GetAppLibVersion(It.IsAny<AltinnRepoEditingContext>()))
                .Returns(NuGet.Versioning.NuGetVersion.Parse("1.0.0"));

            string dataPathWithData = $"{Org}/{App}/api/v1/applicationmetadata";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            ApplicationMetadata expectedApplicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(expectedApplicationMetadataString, SerializerOptions);
            expectedApplicationMetadata.AltinnNugetVersion = string.Empty;
            string expectedJson = JsonSerializer.Serialize(expectedApplicationMetadata, SerializerOptions);
            JsonUtils.DeepEquals(expectedJson, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_ApplicationMetadata_With_V8_Altinn_Nuget_Version_Ok()
        {
            string expectedApplicationMetadataString = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/config/applicationmetadata.json");
            _appDevelopmentServiceMock
                .Setup(rs => rs.GetAppLibVersion(It.IsAny<AltinnRepoEditingContext>()))
                .Returns(NuGet.Versioning.NuGetVersion.Parse("8.0.0"));

            string dataPathWithData = $"{Org}/{App}/api/v1/applicationmetadata";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            ApplicationMetadata expectedApplicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(expectedApplicationMetadataString, SerializerOptions);
            expectedApplicationMetadata.AltinnNugetVersion = "8.0.0.0";
            string expectedJson = JsonSerializer.Serialize(expectedApplicationMetadata, SerializerOptions);
            JsonUtils.DeepEquals(expectedJson, responseBody).Should().BeTrue();
        }
    }
}
