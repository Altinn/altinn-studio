#nullable  enable
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
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

public class GetCodeListsNewTests : DesignerEndpointsTestsBase<GetCodeListsNewTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IOrgCodeListService> _orgCodeListService;
    private const string Org = "ttd";

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
        Source source = new() { Name = "sourceName", Version = "1.0", QueryParameters = queryParameters };
        CodeList codeList = new()
        {
            Codes =
            [
                new Code
                {
                    Value = "no",
                    Label = new Dictionary<string, string> { { "nb", "Norge" } },
                    Description = new Dictionary<string, string> { { "nb", "Et land i nord europa." } },
                    HelpText = new Dictionary<string, string> { { "nb", "En hjelpe tekst." } },
                    Tags = ["tag"]
                }
            ],
            Source = source,
            TagNames = ["tagName"]
        };
        List<CodeListWrapper> expected =
        [
            new()
            {
                Title = "",
                CodeList = codeList,
                HasError = false
            }
        ];

        _orgCodeListService
            .Setup(service => service.GetCodeListsNew(Org, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        string apiUrl = ApiUrl();
        using HttpRequestMessage request = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(request);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<CodeListWrapper>? result = JsonSerializer.Deserialize<List<CodeListWrapper>>(responseBody);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(expected, result);

        _orgCodeListService.Verify(service => service.GetCodeListsNew(Org, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static string ApiUrl() => $"designer/api/{Org}/code-lists/new/";
}
