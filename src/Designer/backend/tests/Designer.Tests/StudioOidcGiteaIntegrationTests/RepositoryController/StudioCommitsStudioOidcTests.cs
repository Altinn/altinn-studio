using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.RepositoryController;

public class StudioCommitsStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<StudioCommitsStudioOidcTests>
{
    public StudioCommitsStudioOidcTests(
        StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
        StudioOidcGiteaFixture giteaFixture,
        StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
    )
        : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

    [Theory]
    [InlineData(GiteaConstants.TestOrgUsername)]
    public async Task Commit_AndPush_Separate_Should_Push_Studio_Commit(string org)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName("-oidc");
        await CreateAppUsingDesigner(org, targetRepo);

        await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file");
        using var commitContent = new StringContent(
            GetCommitInfoJson("test commit", org, targetRepo),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage commitResponse = await HttpClient.PostAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/commit",
            commitContent
        );
        Assert.Equal(HttpStatusCode.OK, commitResponse.StatusCode);

        using HttpResponseMessage pushResponse = await HttpClient.PostAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/push",
            null
        );
        Assert.Equal(HttpStatusCode.OK, pushResponse.StatusCode);

        await VerifyLatestCommitIsFromStudio(org, targetRepo, "test commit");
    }

    [Theory]
    [InlineData(GiteaConstants.TestOrgUsername)]
    public async Task Commit_AndPush_AndContents_Should_Push_Studio_Commit(string org)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName("-oidc");
        await CreateAppUsingDesigner(org, targetRepo);

        await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

        using var commitAndPushContent = new StringContent(
            GetCommitInfoJson("test commit", org, targetRepo),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push",
            commitAndPushContent
        );
        Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

        await VerifyLatestCommitIsFromStudio(org, targetRepo, "test commit");
    }

    [Theory]
    [InlineData(GiteaConstants.TestOrgUsername)]
    public async Task Commit_AndPush_AndContents_WorksAfterResetOfRepo(string org)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName("-oidc");
        await CreateAppUsingDesigner(org, targetRepo);

        await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

        using var commitAndPushContent = new StringContent(
            GetCommitInfoJson("test commit", org, targetRepo),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push",
            commitAndPushContent
        );
        Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

        await VerifyLatestCommitIsFromStudio(org, targetRepo, "test commit");

        using HttpResponseMessage resetResponse = await HttpClient.GetAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/reset"
        );
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        using HttpResponseMessage appDevelopmentIndes = await HttpClient.GetAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/status"
        );
        Assert.Equal(HttpStatusCode.OK, appDevelopmentIndes.StatusCode);

        await File.WriteAllTextAsync($"{CreatedFolderPath}/newFile.txt", "I am a new file");

        using var commitAndPushContent2 = new StringContent(
            GetCommitInfoJson("test commit", org, targetRepo),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage commitAndPushResponse2 = await HttpClient.PostAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push",
            commitAndPushContent2
        );
        Assert.Equal(HttpStatusCode.OK, commitAndPushResponse2.StatusCode);

        await VerifyLatestCommitIsFromStudio(org, targetRepo, "test commit");
    }

    [Theory]
    [InlineData(GiteaConstants.TestOrgUsername)]
    public async Task LocalAndStudioDevelopment_PullLocalCommitFirst_BehaveAsExpected(string org)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName("-oidc");
        await CreateAppUsingDesigner(org, targetRepo);
        await VerifyLatestCommitIsFromStudio(org, targetRepo, "App created");

        using var createFileContent = new StringContent(
            GenerateCommitJsonPayload("I am a new file created in gitea", "test gitea commit"),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync(
            $"repos/{org}/{targetRepo}/contents/test2.txt",
            createFileContent
        );
        Assert.Equal(HttpStatusCode.Created, createFileResponse.StatusCode);

        using HttpResponseMessage pullResponse = await HttpClient.GetAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/pull"
        );
        Assert.Equal(HttpStatusCode.OK, pullResponse.StatusCode);

        await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file created directly with gitea");
        using var commitAndPushContent = new StringContent(
            GetCommitInfoJson("test commit", org, targetRepo),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push",
            commitAndPushContent
        );
        Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);
        await VerifyLatestCommitIsFromStudio(org, targetRepo, "test commit");
    }

    [Theory]
    [InlineData(GiteaConstants.TestOrgUsername)]
    public async Task LocalAndStudioDevelopment_BeginEditAndPullLocalCommit(string org)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName("-oidc");
        await CreateAppUsingDesigner(org, targetRepo);
        await VerifyLatestCommitIsFromStudio(org, targetRepo, "App created");

        using var createFileContent = new StringContent(
            GenerateCommitJsonPayload("I am a new file created in gitea", "test gitea commit"),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync(
            $"repos/{org}/{targetRepo}/contents/test2.txt",
            createFileContent
        );
        Assert.Equal(HttpStatusCode.Created, createFileResponse.StatusCode);

        await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file created directly with gitea");

        using HttpResponseMessage pullResponse = await HttpClient.GetAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/pull"
        );
        Assert.Equal(HttpStatusCode.OK, pullResponse.StatusCode);

        using var commitAndPushContent = new StringContent(
            GetCommitInfoJson("test commit", org, targetRepo),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync(
            $"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push",
            commitAndPushContent
        );
        Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);
        await VerifyLatestCommitIsFromStudio(org, targetRepo, "test commit");
    }

    // Studio commits in the developer's name with an address that only Studio uses, which tells them apart from
    // commits made outside Studio.
    private async Task VerifyLatestCommitIsFromStudio(string org, string targetRepo, string expectedMessage)
    {
        // Read through git refs: Gitea updates its branch list in the background after a push.
        using HttpResponseMessage refResponse = await GiteaFixture.GiteaClient.Value.GetAsync(
            $"repos/{org}/{targetRepo}/git/refs/heads/master"
        );
        Assert.Equal(HttpStatusCode.OK, refResponse.StatusCode);
        string headSha = JsonNode.Parse(await refResponse.Content.ReadAsStringAsync())![0]!["object"]![
            "sha"
        ]!.ToString();

        using HttpResponseMessage commitResponse = await GiteaFixture.GiteaClient.Value.GetAsync(
            $"repos/{org}/{targetRepo}/git/commits/{headSha}"
        );
        Assert.Equal(HttpStatusCode.OK, commitResponse.StatusCode);

        var commitNode = JsonNode.Parse(await commitResponse.Content.ReadAsStringAsync())!["commit"]!;
        Assert.Equal(expectedMessage, commitNode["message"]!.ToString().Trim());
        Assert.EndsWith($"@{General.StudioCommitEmailDomain}", commitNode["author"]!["email"]!.ToString());
    }
}
