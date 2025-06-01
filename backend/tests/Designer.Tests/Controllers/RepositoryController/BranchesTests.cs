using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class BranchesTests : DesignerEndpointsTestsBase<BranchesTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix => "/designer/api/repos";
        public BranchesTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        [Fact]
        public async Task Branches_Returned_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/ttd/apps-test/branches";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            List<Branch> responseContent = await response.Content.ReadAsAsync<List<Branch>>();

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(2, responseContent.Count);
            Assert.Equal("master", responseContent[0].Name);
        }
    }
}
