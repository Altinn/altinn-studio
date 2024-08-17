using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Services;
using Designer.Tests.Utils;
using FluentAssertions;
using SharedResources.Tests;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController;


public class GitDiffIntegrationTests : GiteaIntegrationTestsBase<GitDiffIntegrationTests>
{
    private readonly ITestOutputHelper _testOutputHelper;

    public GitDiffIntegrationTests(GiteaWebAppApplicationFactoryFixture<Program> factory, GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider, ITestOutputHelper testOutputHelper) : base(factory, giteaFixture, sharedDesignerHttpClientProvider)
    {
        _testOutputHelper = testOutputHelper;
    }

    [Theory]
    [InlineData(GiteaConstants.TestOrgUsername)]
    public async Task GetGitDiff_ShouldReturnOkWithDiff(string org)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName();
        await CreateAppUsingDesigner(org, targetRepo);
        string defaultLayoutSetName = "form";
        string newLayoutSetName = "newLayoutSetName";
        string updateLayoutSetNameUrl = $"api/{org}/{targetRepo}/app-development/layout-set/{defaultLayoutSetName}";
        string pathToGitDiffResponse = Path.Combine("..", "..", "..", "_TestData", "AppChangesForIntegrationTests", "GitDiffResponse.json");
        string expectedGitDiffResponse = await File.ReadAllTextAsync(pathToGitDiffResponse);

        using var httpRequestMessageWithNewLayoutSetName = new HttpRequestMessage(HttpMethod.Put, updateLayoutSetNameUrl)
        {
            Content = new StringContent($"\"{newLayoutSetName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        var updateLayoutSetNameResponse = await HttpClient.SendAsync(httpRequestMessageWithNewLayoutSetName);
        updateLayoutSetNameResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        string getGitDiffUrl = $"api/repos/repo/{org}/{targetRepo}/diff";
        using var httpRequestMessageGetGitDiff = new HttpRequestMessage(HttpMethod.Get, getGitDiffUrl);
        var gitDiffResponse = await HttpClient.SendAsync(httpRequestMessageGetGitDiff);
        string responseContent = await gitDiffResponse.Content.ReadAsStringAsync();
        gitDiffResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        JsonUtils.DeepEquals(expectedGitDiffResponse, responseContent).Should().BeTrue();
    }

}
