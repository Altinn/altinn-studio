using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository;

public class AltinnOrgGitRepositoryTests
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public void GetCodeListIds_WithRepoThatHasCodeLists_ShouldReturnCodeListPathNames()
    {
        // Arrange
        const string repository = "org-content";
        AltinnOrgGitRepository altinnOrgGitRepository = PrepareRepositoryForTest(Org, repository, Developer);

        // Act
        string[] codeListIds = altinnOrgGitRepository.GetCodeListIds();

        // Assert
        Assert.NotNull(codeListIds);
        Assert.Equal(8, codeListIds.Length);
    }

    [Fact]
    public void GetCodeListIds_WithRepoThatHasNoCodeLists_ShouldReturnEmptyList()
    {
        // Arrange
        const string repository = "org-content-empty";
        AltinnOrgGitRepository altinnOrgGitRepository = PrepareRepositoryForTest(Org, repository, Developer);

        // Act
        string[] codeListIds = altinnOrgGitRepository.GetCodeListIds();

        // Assert
        Assert.Empty(codeListIds);
    }

    [Fact]
    public async Task GetCodeList_WithRepoThatHasCodeLists_ShouldReturnACodeListsWithCorrectValues()
    {
        // Arrange
        const string repository = "org-content";
        const string codeListId = "codeListString";
        AltinnOrgGitRepository altinnOrgGitRepository = PrepareRepositoryForTest(Org, repository, Developer);

        // Act
        List<Option> codeLists = await altinnOrgGitRepository.GetCodeList(codeListId);

        // Assert
        Assert.NotNull(codeLists);
        Assert.Equal(3, codeLists.Count);
        Assert.Equal("norway", codeLists[0].Value);
        Assert.Equal("denmark", codeLists[1].Value);
        Assert.Equal("sweden", codeLists[2].Value);
    }

    [Fact]
    public async Task GetCodeLists_WithSpecifiedCodeListIdDoesNotExistInOrg_ShouldThrowNotFoundException()
    {
        // Arrange
        const string repository = "org-content";
        const string codeListId = "not-found";
        AltinnOrgGitRepository altinnOrgGitRepository = PrepareRepositoryForTest(Org, repository, Developer);

        // Assert
        await Assert.ThrowsAsync<LibGit2Sharp.NotFoundException>(async () => await altinnOrgGitRepository.GetCodeList(codeListId));
    }

    [Fact]
    public async Task CreateCodeList_WithRepoThatHasCodeLists_ShouldCreateCodeList()
    {
        // Arrange
        const string repository = "org-content-empty";
        const string newCodeListName = "codeListString";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        await TestDataHelper.CopyRepositoryForTest(Org, repository, Developer, targetRepository);
        AltinnOrgGitRepository altinnOrgGitRepository = PrepareRepositoryForTest(Org, repository, Developer);

        List<Option> newCodeList = new()
        {
            new Option { Label = "label1", Value = "value1", }, new Option { Label = "label2", Value = "value2", }
        };

        // Act
        await altinnOrgGitRepository.CreateCodeList(newCodeListName, newCodeList);

        // Assert

    }

    private static AltinnOrgGitRepository PrepareRepositoryForTest(string org, string repository, string developer)
    {

        string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
        var altinnOrgGitRepository = new AltinnOrgGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

        return altinnOrgGitRepository;
    }
}
