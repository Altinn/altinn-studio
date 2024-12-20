using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class GetOptionListsReferencesTests : DesignerEndpointsTestsBase<GetOptionListsReferencesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    const string RepoWithUsedOptions = "app-with-options";
    const string RepoWithUnusedOptions = "app-with-layoutsets";

    public GetOptionListsReferencesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetOptionListsReferences_Returns200OK_WithValidOptionsReferences()
    {
        string apiUrl = $"/designer/api/ttd/{RepoWithUsedOptions}/options/usage";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<RefToOptionListSpecifier> responseList = JsonSerializer.Deserialize<List<RefToOptionListSpecifier>>(responseBody);

        List<RefToOptionListSpecifier> expectedResponseList = new()
        {
            new RefToOptionListSpecifier
            {
                OptionListId = "test-options", OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-same-set-and-another-layout"],
                        LayoutName = "layoutWithOneOptionListIdRef.json",
                        LayoutSetId = "layoutSet1"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-test-options-id", "component-using-test-options-id-again"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs.json",
                        LayoutSetId = "layoutSet1"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-another-set"],
                        LayoutName = "layoutWithTwoOptionListIdRefs.json",
                        LayoutSetId = "layoutSet2"
                    }
                ]
            },
            new()
            {
                OptionListId = "other-options", OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-other-options-id"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs.json",
                        LayoutSetId = "layoutSet1"
                    }
                ]
            }
        };

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equivalent(expectedResponseList, responseList);
    }

    [Fact]
    public async Task GetOptionListsReferences_Returns200Ok_WithEmptyOptionsReferences_WhenLayoutsDoesNotReferenceAnyOptionsInApp()
    {
        string apiUrl = $"/designer/api/ttd/{RepoWithUnusedOptions}/options/usage";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equivalent("[]", responseBody);
    }
}
