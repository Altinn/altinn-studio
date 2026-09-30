using System;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController;

/// <summary>
/// Preview must serve the layouts of an app whose page and layout set names Designer would not create
/// today. A page name with a space or with dots and a layout set folder name longer than the 28
/// characters Designer allows are all legal on disk, and the app frontend renders them.
/// </summary>
public class GetFormLayoutsWithLegacyNamesTests
    : PreviewControllerTestsBase<GetFormLayoutsWithLegacyNamesTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string AppWithLegacyNames = "app-with-legacy-layout-names";
    private const string LayoutSetWithLegacyPageNames = "legacySet";
    private const string LayoutSetWithLongFolderName = "legacy-subform-name-longer-than-28-chars";
    private const string PageNameWithSpace = "Text field";
    private const string PageNameWithDots = "1.Intro";

    public GetFormLayoutsWithLegacyNamesTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task Get_FormLayouts_PageNamesWithSpaceAndDots_ReturnsEveryPage()
    {
        // Arrange
        string url = $"{Org}/{AppWithLegacyNames}/api/layouts/{LayoutSetWithLegacyPageNames}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, url);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode formLayouts = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        Assert.NotNull(formLayouts[PageNameWithSpace]);
        Assert.NotNull(formLayouts[PageNameWithDots]);
        Assert.NotNull(formLayouts["Side1"]);
    }

    [Fact]
    public async Task Get_FormLayouts_LayoutSetFolderNameLongerThanNamingPolicy_ReturnsThePages()
    {
        // Arrange
        string url = $"{Org}/{AppWithLegacyNames}/api/layouts/{Uri.EscapeDataString(LayoutSetWithLongFolderName)}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, url);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode formLayouts = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        Assert.NotNull(formLayouts["Side1"]);
    }
}
