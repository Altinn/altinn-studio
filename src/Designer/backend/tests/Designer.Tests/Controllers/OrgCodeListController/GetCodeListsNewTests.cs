#nullable  enable
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
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

public class GetCodeListsNewTests : DesignerEndpointsTestsBase<GetCodeListsNewTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgCodeListService> _orgCodeListService;
    private const string Org = "ttd";
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public GetCodeListsNewTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        _orgCodeListService = new Mock<IOrgCodeListService>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_orgCodeListService.Object);
    }

    [Fact]
    public async Task Get_Returns200OK_WhenRetrievingCodeLists()
    {
        // Arrange
        Dictionary<string, string> queryParameters = new() { { "key", "value" } };
        CodeListSource source = new(Name: "sourceName", Version: "1.0", QueryParameters: queryParameters);
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
        CodeList codeList = new(
            Codes: codes,
            Source: source,
            TagNames: ["tagName"]
        );
        List<CodeListWrapper> codeListWrappers =
        [
            new(
                Title: "CodeListId",
                CodeList: codeList,
                HasError: false
            )
        ];

        var expected = new GetCodeListResponse(codeListWrappers, "latestCommitSha");

        _orgCodeListService
            .Setup(service => service.GetCodeListsNew(Org, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        string apiUrl = ApiUrl();
        using HttpRequestMessage request = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(request);
        string responseBody = await response.Content.ReadAsStringAsync();
        GetCodeListResponse? result = JsonSerializer.Deserialize<GetCodeListResponse>(responseBody, s_jsonOptions);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expected, result);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        _orgCodeListService.Verify(service => service.GetCodeListsNew(Org, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static string ApiUrl() => $"designer/api/{Org}/code-lists/new/";
}
