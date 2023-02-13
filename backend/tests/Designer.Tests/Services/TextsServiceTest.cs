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

public class TextsServiceTest
{

    [Fact]
    public async Task UpdateRelatedFiles_KeyExistInLayoutInLayoutSet_ShouldFindNewId()
    {
        string org = "ttd";
        string repository = "app-with-layoutsets";
        string developer = "testUser";
        string layoutSetName = "layoutSet1";
        string layoutName = "layoutFile1InSet1.json";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        try
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
            await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

            await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
            FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

            formLayout.Should().NotBeNull();
            formLayout.data.layout[0].textResourceBindings["title"].Should().Be("new-id");
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
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

        try
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
            await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

            await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
            FormLayout formLayout1 = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);
            FormLayout formLayout2 = await altinnAppGitRepository.GetLayout(layoutSetName2, layoutName2);

            formLayout1.Should().NotBeNull();
            formLayout2.Should().NotBeNull();
            formLayout1.data.layout[0].textResourceBindings["title"].Should().Be("new-id");
            formLayout2.data.layout[0].textResourceBindings["title"].Should().Be("new-id");
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
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

        try
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
            await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

            await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
            FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

            formLayout.Should().NotBeNull();
            formLayout.data.layout[0].textResourceBindings["title"].Should().Be("new-id");
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
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

        try
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
            await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);

            List<TextIdMutation> keyMutations = new() { new() { OldId = "a-key-that-does-not-exist", NewId = "new-id" } };
            await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
            FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

            formLayout.Should().NotBeNull();
            formLayout.data.layout[0].textResourceBindings["title"].Should().Be("some-old-id");
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }

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

        try
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            ITextsService textsService = new TextsService(altinnGitRepositoryFactory);
            await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);

            List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id" } };
            await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
            FormLayout formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

            formLayout.Should().NotBeNull();
            formLayout.data.layout[0].textResourceBindings.Where(trb => trb.Value == "some-old-key").Should().BeEmpty();
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
    }

}
