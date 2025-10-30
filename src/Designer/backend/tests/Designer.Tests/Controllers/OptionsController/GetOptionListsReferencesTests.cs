#nullable disable
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class GetOptionListsReferencesTests : DesignerEndpointsTestsBase<GetOptionListsReferencesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    const string RepoWithUsedOptions = "app-with-options";
    const string RepoWithUnusedOptions = "app-with-layoutsets";
    const string RepoWithoutOptions = "empty-app";

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
        List<OptionListReference> responseList = JsonSerializer.Deserialize<List<OptionListReference>>(responseBody);

        List<OptionListReference> expectedResponseList = new()
        {
            new OptionListReference
            {
                OptionListId = "test-options", OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-same-set-and-another-layout"],
                        LayoutName = "layoutWithOneOptionListIdRef",
                        LayoutSetId = "layoutSet1",
                        TaskId = "Task_1",
                        TaskType = "data"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-test-options-id", "component-using-test-options-id-again"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1",
                        TaskId = "Task_1",
                        TaskType = "data"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-another-set"],
                        LayoutName = "layoutWithTwoOptionListIdRefs",
                        LayoutSetId = "layoutSet2",
                        TaskId = "Task_2",
                        TaskType = "data"
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
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1",
                        TaskId = "Task_1",
                        TaskType = "data"
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

    [Fact]
    public async Task GetOptionListsReferences_Returns200Ok_WithEmptyOptionsReferences_WhenAppDoesNotHaveOptions()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", RepoWithoutOptions, "testUser", targetRepository);
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory("ttd", targetRepository, "testUser");
        string exampleLayout = @"{ ""data"": {""layout"": []}}";
        string filePath = Path.Combine(repoPath, "App/ui/form/layouts");
        Directory.CreateDirectory(filePath);
        await File.WriteAllTextAsync(Path.Combine(filePath, "exampleLayout.json"), exampleLayout);

        string apiUrl = $"/designer/api/ttd/{targetRepository}/options/usage";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equivalent("[]", responseBody);
    }
}
