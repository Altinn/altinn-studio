using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController;

public class GetOptionsTests
    : PreviewControllerTestsBase<GetOptionsTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    public GetOptionsTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    private readonly Mock<ISharedContentClient> _sharedContentClient = new();

    [Fact]
    public async Task Get_Options_when_options_exists_Ok()
    {
        string dataPathWithData = $"{Org}/{PreviewApp}/api/options/test-options";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string responseBody = await response.Content.ReadAsStringAsync();
        string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
        Assert.Equal(
            @"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]",
            responseStringWithoutWhitespaces
        );
    }

    [Fact]
    public async Task Get_Options_when_code_list_exists_in_organization_library_Ok()
    {
        string orgName = "testOrg";
        string codeListId = "testCodeList";
        string version = "latest";
        var orgLibCodeList = GetOrgLibCodeList();
        _sharedContentClient
            .Setup(x => x.GetPublishedCodeListForOrg(orgName, codeListId, version, It.IsAny<CancellationToken>()))
            .ReturnsAsync(orgLibCodeList);
        string dataPathWithData = $"{Org}/{PreviewApp}/api/options/lib**{orgName}**{codeListId}**{version}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string responseBody = await response.Content.ReadAsStringAsync();
        string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
        Assert.Equal(
            @"[{""value"":""testValue"",""label"":""testLabel"",""description"":""testDescription"",""helpText"":""testHelpText""}]",
            responseStringWithoutWhitespaces
        );
    }

    [Fact]
    public async Task Get_Options_when_options_exists_for_v4_app_Ok()
    {
        Instance instance = await CreateInstance();
        string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/options/test-options";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string responseBody = await response.Content.ReadAsStringAsync();
        string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
        Assert.Equal(
            @"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]",
            responseStringWithoutWhitespaces
        );
    }

    [Fact]
    public async Task Get_Options_when_no_options_exist_returns_Ok_empty_list()
    {
        string dataPathWithData = $"{Org}/{AppV4}/api/options/non-existing-options";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
        httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet=");

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string responseBody = await response.Content.ReadAsStringAsync();
        Assert.Equal("[]", responseBody);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_sharedContentClient.Object);
    }

    private static CodeList GetOrgLibCodeList()
    {
        return new CodeList(
            new List<Code>
            {
                new(
                    Value: "testValue",
                    Label: new Dictionary<string, string>() { { LanguageConst.Nb, "testLabel" } },
                    Description: new Dictionary<string, string>() { { LanguageConst.Nb, "testDescription" } },
                    HelpText: new Dictionary<string, string>() { { LanguageConst.Nb, "testHelpText" } },
                    Tags: ["test-data"]
                ),
            },
            new CodeListSource("testName"),
            new List<string>()
        );
    }
}
