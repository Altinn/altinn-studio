using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class RepositorySettingsControllerTests : ApiTestsBase<RepositorySettingsController, RepositorySettingsControllerTests>
    {
        public RepositorySettingsControllerTests(WebApplicationFactory<RepositorySettingsController> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        [Fact]
        public async Task Get_RepositorySettings_ShouldReturnOk()
        {
            var org = "ttd";
            var sourceRepository = "xyz-datamodels";
            var developer = "testUser";
            var targetRepository = $"{Guid.NewGuid()}-datamodels";
            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            string requestUrl = $"/designer/api/v1/{org}/{targetRepository}/repositorysettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);

            try
            {
                HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
                var altinnStudioSettings = await response.Content.ReadAsAsync<AltinnStudioSettings>();

                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.Equal(AltinnRepositoryType.Datamodels, altinnStudioSettings.RepoType);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task Get_RepositoryDoesNotExists_ShouldReturnNotFound()
        {
            var org = "ttd";
            var targetRepository = $"thisDoesNotExist-datamodels";

            string requestUrl = $"/designer/api/v1/{org}/{targetRepository}/repositorysettings";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Put_ValidRepositorySettings_ShouldUpdate()
        {
            var org = "ttd";
            var sourceRepository = "xyz-datamodels";
            var developer = "testUser";
            var targetRepository = $"{Guid.NewGuid()}-datamodels";
            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            string requestUrl = $"/designer/api/v1/{org}/{targetRepository}/repositorysettings";
            var requestBody = @"{""repoType"": ""Datamodels"", ""datamodelling.preference"": ""JsonSchema""}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUrl)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            try
            {
                HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
                var altinnStudioSettings = await response.Content.ReadAsAsync<AltinnStudioSettings>();

                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.Equal(AltinnRepositoryType.Datamodels, altinnStudioSettings.RepoType);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }
    }
}
