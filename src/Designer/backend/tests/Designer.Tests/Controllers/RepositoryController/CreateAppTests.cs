using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using IRepository = Altinn.Studio.Designer.Services.Interfaces.IRepository;
using Repository = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class CreateAppTests : DesignerEndpointsTestsBase<CreateAppTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<IRepository> _repositoryMock = new Mock<IRepository>();
        private static string VersionPrefix => "/designer/api/repos";
        public CreateAppTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGiteaClient, IGiteaClientMock>();
            services.AddSingleton(_ => _repositoryMock.Object);
        }

        [Fact]
        public async Task CreateApp_InvalidRepoName_BadRequest()
        {
            // Arrange
            string uri = $"{VersionPrefix}/create-app";
            var content = new StringContent(JsonSerializer.Serialize(new CreateAppRequest
            {
                Org = "ttd",
                Repository = "2021-application",

            }), System.Text.Encoding.UTF8, "application/json");

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);
            httpRequestMessage.Content = content;

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CreateApp_ValidRepoName_Created()
        {
            // Arrange
            string uri = $"{VersionPrefix}/create-app";
            var content = new StringContent(JsonSerializer.Serialize(new CreateAppRequest
            {
                Org = "ttd",
                Repository = "test",

            }), System.Text.Encoding.UTF8, "application/json");

            _repositoryMock
                .Setup(r => r.CreateService(It.IsAny<string>(), It.IsAny<ServiceConfiguration>(), It.IsAny<List<CustomTemplateReference>>()))
                .ReturnsAsync(new Repository() { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://some.site/this/is/not/relevant" });

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);
            httpRequestMessage.Content = content;

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task CreateApp_TemplateIncluded_Created()
        {

            // Arrange
            string uri = $"{VersionPrefix}/create-app";
            var content = new StringContent(JsonSerializer.Serialize(new CreateAppRequest
            {
                Org = "ttd",
                Repository = "test",
                Template = new CustomTemplateReference
                {
                    Owner = "ttd",
                    Id = "custom-template"
                }
            }), System.Text.Encoding.UTF8, "application/json");

            _repositoryMock
                .Setup(r => r.CreateService(It.IsAny<string>(), It.IsAny<ServiceConfiguration>(), It.Is<List<CustomTemplateReference>>(l => l.Count == 1 && l[0].Id == "custom-template")))
                .ReturnsAsync(new Repository() { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://some.site/this/is/not/relevant" });

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);
            httpRequestMessage.Content = content;

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }
    }
}
