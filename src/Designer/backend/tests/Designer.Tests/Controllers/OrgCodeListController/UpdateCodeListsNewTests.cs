#nullable  enable
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class UpdateCodeListsNewTests : DesignerEndpointsTestsBase<UpdateCodeListsNewTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgCodeListService> _orgCodeListService;
    private const string Org = "ttd";
    private const string Developer = "testUser";

    public UpdateCodeListsNewTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        _orgCodeListService = new Mock<IOrgCodeListService>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_orgCodeListService.Object);
    }

    [Fact]
    public async Task Put_Returns200OK_WhenUpdatingCodeList()
    {
        // Arrange
        const string NewCodeListId = "countries";
        const string DeleteCodeListId = "municipalities";
        const string CommitMessage = "My commit message";
        Dictionary<string, string> queryParameters = new() { { "key", "value" } };
        CodeListSource source = new(Name: "Klass", Version: "1.0", QueryParameters: queryParameters);
        List<Code> codes =
        [
            new(
                value: "no",
                label: new Dictionary<string, string> { { "nb", "Norge" } },
                description: new Dictionary<string, string> { { "nb", "Et land i nord europa." } },
                helpText: new Dictionary<string, string> { { "nb", "En hjelpe tekst." } },
                tags: ["tag"]
            )
        ];
        CodeList newCodeList = new(
            Codes: codes,
            Source: source,
            TagNames: ["tagName"]
        );
        List<CodeListWrapper> wrappers =
        [
            new(
                Title: NewCodeListId,
                CodeList: newCodeList,
                HasError: false
            ),
            new(
                Title: DeleteCodeListId,
                CodeList: null,
                HasError: null
            )
        ];
        UpdateCodeListRequest requestBody = new(
            CodeListWrappers: wrappers,
            CommitMessage: CommitMessage
        );

        string apiUrl = ApiUrl();
        using HttpRequestMessage request = new(HttpMethod.Put, apiUrl);
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, mediaType: MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _orgCodeListService.Verify(service => service.UpdateCodeListsNew(Org, Developer, It.IsAny<List<CodeListWrapper>>(), CommitMessage, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static string ApiUrl() => $"designer/api/{Org}/code-lists/new/";
}
