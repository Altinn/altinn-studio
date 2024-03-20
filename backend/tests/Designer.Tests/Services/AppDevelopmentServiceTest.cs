using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using FluentAssertions;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppDevelopmentServiceTest : IDisposable
{

    private readonly Mock<ISchemaModelService> _schemaModelServiceMock;
    private readonly IAppDevelopmentService _appDevelopmentService;
    private readonly AltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly string _org = "ttd";
    private readonly string _repository = "app-with-layoutsets";
    private readonly string _developer = "testUser";

    public AppDevelopmentServiceTest()
    {
        _schemaModelServiceMock = new Mock<ISchemaModelService>();
        _altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        _appDevelopmentService = new AppDevelopmentService(_altinnGitRepositoryFactory, _schemaModelServiceMock.Object);
    }

    public string CreatedTestRepoPath { get; set; }


    [Fact]
    public async Task GetLayoutSettings_FromAppWithOutLayoutSet_ShouldReturnSettings()
    {
        string repository = "app-without-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, repository, _developer, targetRepository);
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), null);

        layoutSettings.Should().NotBeNull();
    }

    [Fact]
    public async Task SaveLayoutSettingsWithAdditionalPage_ToAppWithOutLayoutSet_ShouldHaveThreePages()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        string layoutSetName = "layoutSet1";
        string layoutSettingsSchemaUrl = "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";

        var jsonSettingsUpdatedString = $@"{{
            ""$schema"": ""{layoutSettingsSchemaUrl}"",
            ""pages"": {{
                ""order"": [
                    ""layoutFile1"",
                    ""layoutFile2"",
                    ""layoutFile3""
                ]
            }}
        }}";

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);

        var layoutSettingsUpdated = JsonNode.Parse(jsonSettingsUpdatedString);

        await _appDevelopmentService.SaveLayoutSettings(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), layoutSettingsUpdated, layoutSetName);
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), layoutSetName);

        layoutSettings.Should().NotBeNull();
        (layoutSettings["pages"]["order"] as JsonArray).Should().HaveCount(3);
    }

    [Fact]
    public async Task GetLayoutSettings_FromAppWithLayoutSet_ShouldReturnSettings()
    {
        string layoutSetName = "layoutSet1";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), layoutSetName);

        layoutSettings.Should().NotBeNull();
    }


    [Fact]
    public async Task GetLayoutSettings_FromAppWithLayoutSetButNoSettingsExist_ShouldReturnSettingsWithTwoPages()
    {
        string layoutSetName = "layoutSet2";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), layoutSetName);

        layoutSettings.Should().NotBeNull();
        (layoutSettings["pages"]["order"] as JsonArray).Should().HaveCount(2);
    }

    [Fact]
    public async Task UpdateLayoutSet_WhenLayoutSetExistsWithSameId_ShouldUpdateLayoutSet()
    {
        // Arrange
        string newDataTypeName = "NewDataModel";
        string layoutSetToUpdateId = "layoutSet1";
        var newLayoutSet = new LayoutSetConfig { Id = layoutSetToUpdateId, DataType = newDataTypeName };
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);

        // Act
        var updatedLayoutSets = await _appDevelopmentService.UpdateLayoutSet(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), layoutSetToUpdateId, newLayoutSet);

        // Assert
        updatedLayoutSets.Should().NotBeNull();
        updatedLayoutSets.Sets.Should().HaveCount(3);
        updatedLayoutSets.Sets.Should().Contain(newLayoutSet);
    }

    [Fact]
    public async Task UpdateLayoutSet_WhenUpdatingSetIdToAnExistingId_ShouldThrowError()
    {
        // Arrange
        string layoutSetIdToUpdate = "layoutSet1";
        string existingLayoutSetName = "layoutSet2";
        var newLayoutSet = new LayoutSetConfig { Id = existingLayoutSetName };
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);

        // Act and Assert
        await Assert.ThrowsAsync<NonUniqueLayoutSetIdException>(async () =>
        {
            await _appDevelopmentService.UpdateLayoutSet(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), layoutSetIdToUpdate, newLayoutSet);
        });
    }

    [Fact]
    public async Task UpdateLayoutSet_WhenLayoutSetExistsAndNewIdIsProvided_ShouldUpdateLayoutSetWithNewIdAndChangeFolderName()
    {
        // Arrange
        string layoutSetToUpdateId = "layoutSet1";
        var newLayoutSet = new LayoutSetConfig { Id = "newLayoutSet" };
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        AltinnRepoEditingContext altinnRepoEditingContext =
            AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer);
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);

        // Act

        List<string> layoutSetFileNamesBeforeUpdate = GetFileNamesInLayoutSet(layoutSetToUpdateId);

        var updatedLayoutSets = await _appDevelopmentService.UpdateLayoutSet(altinnRepoEditingContext, layoutSetToUpdateId, newLayoutSet);
        List<string> layoutSetFileNamesAfterUpdate = GetFileNamesInLayoutSet(newLayoutSet.Id);

        // Assert
        updatedLayoutSets.Should().NotBeNull();
        updatedLayoutSets.Sets.Should().HaveCount(3);
        updatedLayoutSets.Sets.Should().Contain(newLayoutSet);
        layoutSetFileNamesBeforeUpdate.Should().BeEquivalentTo(layoutSetFileNamesAfterUpdate);
    }

    [Fact]
    public async Task AddLayoutSet_WhenLayoutSetDoesNotExist_ShouldAddNewLayoutSet()
    {
        // Arrange
        var newLayoutSet = new LayoutSetConfig { Id = "newLayoutSet" };
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);

        // Act
        var updatedLayoutSets = await _appDevelopmentService.AddLayoutSet(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), newLayoutSet);

        // Assert
        updatedLayoutSets.Should().NotBeNull();
        updatedLayoutSets.Sets.Should().HaveCount(4);
        updatedLayoutSets.Sets.Should().Contain(newLayoutSet);
    }

    [Fact]
    public async Task AddLayoutSet_WhenLayoutSetIdExist_ShouldThrowError()
    {
        // Arrange
        var newLayoutSet = new LayoutSetConfig { Id = "layoutSet1" };
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, _repository, _developer, targetRepository);

        // Act and Assert
        await Assert.ThrowsAsync<NonUniqueLayoutSetIdException>(async () =>
        {
            await _appDevelopmentService.AddLayoutSet(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), newLayoutSet);
        });
    }

    [Fact]
    public async Task UpdateLayoutSet_WhenAppHasNoLayoutSets_ShouldThrowFileNotFoundException()
    {
        // Arrange
        string repository = "app-without-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, repository, _developer, targetRepository);

        // Act
        Func<Task> act = async () => await _appDevelopmentService.UpdateLayoutSet(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), "layoutSet1", new LayoutSetConfig());

        // Assert
        await act.Should().ThrowAsync<FileNotFoundException>();
    }

    [Fact]
    public async Task AddLayoutSet_WhenAppHasNoLayoutSets_ShouldThrowFileNotFoundException()
    {
        // Arrange
        string repository = "app-without-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(_org, repository, _developer, targetRepository);

        // Act
        Func<Task> act = async () => await _appDevelopmentService.AddLayoutSet(AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer), new LayoutSetConfig());

        // Assert
        await act.Should().ThrowAsync<FileNotFoundException>();
    }

    private List<string> GetFileNamesInLayoutSet(string layoutSetName)
    {
        string[] layoutSetFileNamesPaths = Directory.GetFiles(Path.Combine(CreatedTestRepoPath, "App", "ui", layoutSetName, "layouts"));
        List<string> fileNamesInSet = [];
        foreach (var filePath in layoutSetFileNamesPaths)
        {
            fileNamesInSet.Add(Path.GetFileName(filePath));
        }
        return fileNamesInSet;
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(CreatedTestRepoPath))
        {
            TestDataHelper.DeleteDirectory(CreatedTestRepoPath);
        }
    }
}
