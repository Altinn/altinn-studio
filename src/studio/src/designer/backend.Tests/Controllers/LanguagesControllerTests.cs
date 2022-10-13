using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class LanguagesControllerTests : ApiTestsBase<LanguagesController, LanguagesControllerTests>
    {
        private readonly string _versionPrefix = "designer/api/v1";

        public LanguagesControllerTests(WebApplicationFactory<LanguagesController> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        [Fact]
        public async Task GetLanguages_ReturnsNnAndNb()
        {
            string dataPathWithData = $"{_versionPrefix}/ttd/new-texts-format/languages";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            List<string> responseList = JsonSerializer.Deserialize<List<string>>(responseDocument.RootElement.ToString());

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(new List<string> { "nb", "nn" }, responseList);
        }
    }
}
