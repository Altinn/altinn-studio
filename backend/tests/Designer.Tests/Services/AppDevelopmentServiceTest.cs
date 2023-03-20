using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Services;

public class AppDevelopmentServiceTest : IDisposable
{

    public string CreatedTestRepoPath { get; set; }

    [Fact]
    public async Task GetLayoutSettings_FromAppWithOutLayoutSet_ShouldReturnSettings()
    {
        string org = "ttd";
        string repository = "app-without-layoutsets";
        string developer = "testUser";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        IAppDevelopmentService appDevelopmentService = new AppDevelopmentService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        LayoutSettings layoutSettings = await appDevelopmentService.GetLayoutSettings(org, targetRepository, developer, null);

        layoutSettings.Should().NotBeNull();
    }

    [Fact]
    public async Task SaveLayoutSettingsWithAdditionalPage_ToAppWithOutLayoutSet_ShouldHaveThreePages()
    {
        string org = "ttd";
        string repository = "app-without-layoutsets";
        string developer = "testUser";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        string layoutSettingsSchemaUrl = "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";
        Pages newPages = new() { Order = new[] { "layoutFile1", "layoutFile2", "layoutFile3" } };

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        IAppDevelopmentService appDevelopmentService = new AppDevelopmentService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        LayoutSettings layoutSettingsUpdated = new() { Schema = layoutSettingsSchemaUrl, Pages = newPages };

        await appDevelopmentService.SaveLayoutSettings(org, targetRepository, developer, layoutSettingsUpdated, null);
        LayoutSettings layoutSettings = await appDevelopmentService.GetLayoutSettings(org, targetRepository, developer, null);

        layoutSettings.Should().NotBeNull();
        layoutSettings.Pages.Order.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetLayoutSettings_FromAppWithLayoutSet_ShouldReturnSettings()
    {
        string org = "ttd";
        string repository = "app-with-layoutsets";
        string developer = "testUser";
        string layoutSetName = "layoutSet1";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        IAppDevelopmentService appDevelopmentService = new AppDevelopmentService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        LayoutSettings layoutSettings = await appDevelopmentService.GetLayoutSettings(org, targetRepository, developer, layoutSetName);

        layoutSettings.Should().NotBeNull();
    }


    [Fact]
    public async Task GetLayoutSettings_FromAppWithLayoutSetButNoSettingsExist_ShouldReturnSettingsWithTwoPages()
    {
        string org = "ttd";
        string repository = "app-with-layoutsets";
        string developer = "testUser";
        string layoutSetName = "layoutSet2";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        IAppDevelopmentService appDevelopmentService = new AppDevelopmentService(altinnGitRepositoryFactory);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        LayoutSettings layoutSettings = await appDevelopmentService.GetLayoutSettings(org, targetRepository, developer, layoutSetName);

        layoutSettings.Should().NotBeNull();
        layoutSettings.Pages.Order.Should().HaveCount(2);
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(CreatedTestRepoPath))
        {
            TestDataHelper.DeleteDirectory(CreatedTestRepoPath);
        }
    }
}
