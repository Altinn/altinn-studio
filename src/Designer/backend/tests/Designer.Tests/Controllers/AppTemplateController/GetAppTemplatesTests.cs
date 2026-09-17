using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AppTemplateController;

public class GetAppTemplatesTests
    : DesignerEndpointsTestsBase<GetAppTemplatesTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IAppTemplateCatalog> _catalogMock = new();

    public GetAppTemplatesTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_catalogMock.Object);
    }

    [Fact]
    public async Task GetAppTemplates_ReturnsTemplatesWithoutServerPaths()
    {
        _catalogMock
            .Setup(c => c.GetAppTemplates())
            .Returns([
                new AppTemplate
                {
                    Id = "v9",
                    DisplayName = "Altinn App v9",
                    Description = "Preview",
                    RootPath = "/srv/templates/v9/src",
                },
            ]);

        using HttpResponseMessage response = await HttpClient.GetAsync("designer/api/apptemplates");
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument document = JsonDocument.Parse(responseBody);
        JsonElement template = Assert.Single(document.RootElement.EnumerateArray());
        Assert.Equal("v9", template.GetProperty("id").GetString());
        Assert.Equal("Altinn App v9", template.GetProperty("displayName").GetString());
        Assert.Equal("Preview", template.GetProperty("description").GetString());
        Assert.Equal(
            ["id", "displayName", "description"],
            new List<string>(template.EnumerateObject().Select(p => p.Name))
        );
    }
}
