using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Services;

public class TextsServiceTest : IDisposable
{

    public string CreatedTestRepoPath { get; set; }

    [Fact]
    public async Task UpdateRelatedFiles_KeyExistInLayoutInLayoutSet_ShouldFindNewId()
    {
        string org = "ttd";
        string repository = "app-with-layoutsets";
        string developer = "testUser";
        string layoutSetName = "layoutSet1";
        string layoutName = "layoutFile1InSet1.json";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

        formLayout.Should().NotBeNull();
        formLayout.Data.Layout[0].TextResourceBindings["title"].Should().Be("new-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_MultipleKeysExistInLayoutsAcrossLayoutSets_ShouldFindNewIdInMutlipleFiles()
    {
        string org = "ttd";
        string repository = "app-with-layoutsets";
        string developer = "testUser";
        string layoutSetName1 = "layoutSet1";
        string layoutSetName2 = "layoutSet2";
        string layoutName1 = "layoutFile1InSet1.json";
        string layoutName2 = "layoutFile1InSet2.json";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        FormLayout formLayout1 = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);
        FormLayout formLayout2 = await altinnAppGitRepository.GetLayout(layoutSetName2, layoutName2);

        formLayout1.Should().NotBeNull();
        formLayout2.Should().NotBeNull();
        formLayout1.Data.Layout[0].TextResourceBindings["title"].Should().Be("new-id");
        formLayout2.Data.Layout[0].TextResourceBindings["title"].Should().Be("new-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyExistInLayout_ShouldFindNewId()
    {
        string org = "ttd";
        string repository = "app-without-layoutsets";
        string developer = "testUser";
        string layoutSetName = null;
        string layoutName = "layoutFile1.json";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

        formLayout.Should().NotBeNull();
        formLayout.Data.Layout[0].TextResourceBindings["title"].Should().Be("new-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyDoesNotExistInLayout_ShouldReturn()
    {
        string org = "ttd";
        string repository = "app-with-layoutsets";
        string developer = "testUser";
        string layoutSetName = "layoutSet1";
        string layoutName = "layoutFile1InSet1.json";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);

        List<TextIdMutation> keyMutations = new() { new() { OldId = "a-key-that-does-not-exist", NewId = "new-id" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

        formLayout.Should().NotBeNull();
        formLayout.Data.Layout[0].TextResourceBindings["title"].Should().Be("some-old-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_WithoutNewKey_ShouldDeleteReference()
    {
        string org = "ttd";
        string repository = "app-with-layoutsets";
        string developer = "testUser";
        string layoutSetName = "layoutSet1";
        string layoutName = "layoutFile1InSet1.json";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);

        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

        formLayout.Should().NotBeNull();
        formLayout.Data.Layout[0].TextResourceBindings.Where(trb => trb.Value == "some-old-key").Should().BeEmpty();
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(CreatedTestRepoPath))
        {
            TestDataHelper.DeleteDirectory(CreatedTestRepoPath);
        }
    }
}
