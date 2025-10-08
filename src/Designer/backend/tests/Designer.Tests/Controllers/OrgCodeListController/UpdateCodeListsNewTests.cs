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
        const string BaseCommitSha = "baseCommitSha";
        Dictionary<string, string> queryParameters = new() { { "key", "value" } };
        CodeListSource source = new(Name: "Klass", Version: "1.0", QueryParameters: queryParameters);
        List<Code> codes =
        [
            new(
                Value: "no",
                Label: new Dictionary<string, string> { { "nb", "Norge" } },
                Description: new Dictionary<string, string> { { "nb", "Et land i nord europa." } },
                HelpText: new Dictionary<string, string> { { "nb", "En hjelpe tekst." } },
                Tags: ["tag"]
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
                CodeList: newCodeList
            ),
            new(
                Title: DeleteCodeListId
            )
        ];
        UpdateCodeListRequest requestBody = new(
            CodeListWrappers: wrappers,
            BaseCommitSha: BaseCommitSha,
            CommitMessage: CommitMessage
        );

        string apiUrl = ApiUrl();
        using HttpRequestMessage request = new(HttpMethod.Put, apiUrl);
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, mediaType: MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _orgCodeListService.Verify(service => service.UpdateCodeListsNew(Org, Developer, requestBody, It.IsAny<CancellationToken>()), Times.Once);
    }
    private static string ApiUrl() => $"designer/api/{Org}/code-lists/new/";
}
