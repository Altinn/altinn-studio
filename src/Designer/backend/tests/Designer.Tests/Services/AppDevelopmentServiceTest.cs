using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Moq;
using NuGet.Versioning;
using Xunit;

namespace Designer.Tests.Services;

public class AppDevelopmentServiceTest : IDisposable
{
    private readonly Mock<ISchemaModelService> _schemaModelServiceMock;
    private readonly Mock<IAppVersionService> _appVersionServiceMock;
    private readonly IAppDevelopmentService _appDevelopmentService;
    private readonly AltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly string _org = "ttd";
    private readonly string _repository = "app-with-layoutsets";
    private readonly string _developer = "testUser";

    public AppDevelopmentServiceTest()
    {
        _schemaModelServiceMock = new Mock<ISchemaModelService>();
        _appVersionServiceMock = new Mock<IAppVersionService>();
        _appVersionServiceMock
            .Setup(s => s.GetAppLibVersion(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(new SemanticVersion(8, 0, 0));
        _altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        _appDevelopmentService = new AppDevelopmentService(
            _altinnGitRepositoryFactory,
            _schemaModelServiceMock.Object,
            _appVersionServiceMock.Object
        );
    }

    public string CreatedTestRepoPath { get; set; }

    [Fact]
    public async Task GetLayoutSettings_FromAppWithOutLayoutSet_ShouldReturnSettings()
    {
        string repository = "app-without-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            repository,
            _developer,
            targetRepository
        );
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
            null
        );

        Assert.NotNull(layoutSettings);
    }

    [Fact]
    public async Task SaveLayoutSettingsWithAdditionalPage_ToAppWithOutLayoutSet_ShouldHaveThreePages()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        string layoutSetName = "layoutSet1";
        string layoutSettingsSchemaUrl = "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";

        var jsonSettingsUpdatedString =
            $@"{{
            ""$schema"": ""{layoutSettingsSchemaUrl}"",
            ""pages"": {{
                ""order"": [
                    ""layoutFile1"",
                    ""layoutFile2"",
                    ""layoutFile3""
                ]
            }}
        }}";

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );

        var layoutSettingsUpdated = JsonNode.Parse(jsonSettingsUpdatedString);

        await _appDevelopmentService.SaveLayoutSettings(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
            layoutSettingsUpdated,
            layoutSetName
        );
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
            layoutSetName
        );

        Assert.NotNull(layoutSettings);

        Assert.Equal(3, ((JsonArray)layoutSettings!["pages"]!["order"]!).Count);
    }

    [Fact]
    public async Task SaveLayoutSettings_ToAppWithSetFolderButNoLayoutSetsFile_ShouldPersistPdfLayoutNameForSameSet()
    {
        // Regression: v9 apps have set folders but no layout-sets.json. Save and read must resolve
        // the same Settings.json for a layoutSetName, else pdfLayoutName is lost (PDF convert revert).
        string layoutSetName = "layoutSet1";
        string pdfLayoutName = "layoutFile1";
        string layoutSettingsSchemaUrl = "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            _org,
            targetRepository,
            _developer
        );

        _appVersionServiceMock.Setup(s => s.IsV9App(It.IsAny<AltinnRepoEditingContext>())).Returns(true);

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );

        // Remove layout-sets.json to mimic a v9 app (set folders without the manifest).
        File.Delete(Path.Combine(CreatedTestRepoPath, "App", "ui", "layout-sets.json"));

        var layoutSettingsToSave = JsonNode.Parse(
            $@"{{
            ""$schema"": ""{layoutSettingsSchemaUrl}"",
            ""pages"": {{
                ""order"": [],
                ""pdfLayoutName"": ""{pdfLayoutName}""
            }}
        }}"
        );

        await _appDevelopmentService.SaveLayoutSettings(editingContext, layoutSettingsToSave, layoutSetName);

        var savedLayoutSettings = await _appDevelopmentService.GetLayoutSettings(editingContext, layoutSetName);

        Assert.NotNull(savedLayoutSettings);
        Assert.Equal(pdfLayoutName, savedLayoutSettings!["pages"]!["pdfLayoutName"]!.GetValue<string>());
    }

    [Fact]
    public async Task GetLayoutSettings_FromAppWithLayoutSet_ShouldReturnSettings()
    {
        string layoutSetName = "layoutSet1";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
            layoutSetName
        );

        Assert.NotNull(layoutSettings);
    }

    [Fact]
    public async Task GetLayoutSettings_FromAppWithLayoutSetButNoSettingsExist_ShouldReturnSettingsWithTwoPages()
    {
        string layoutSetName = "layoutSet2";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );
        var layoutSettings = await _appDevelopmentService.GetLayoutSettings(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
            layoutSetName
        );

        Assert.NotNull(layoutSettings);

        Assert.Equal(2, ((JsonArray)layoutSettings!["pages"]!["order"]!).Count);
    }

    [Fact]
    public async Task UpdateLayoutSet_WhenUpdatingSetIdToAnExistingId_ShouldThrowError()
    {
        // Arrange
        string oldLayoutSetName = "layoutSet1";
        string existingLayoutSetName = "layoutSet2";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );

        // Act and Assert
        await Assert.ThrowsAsync<NonUniqueLayoutSetIdException>(async () =>
        {
            await _appDevelopmentService.UpdateLayoutSetName(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
                oldLayoutSetName,
                existingLayoutSetName
            );
        });
    }

    [Fact]
    public async Task UpdateLayoutSet_WhenLayoutSetExistsAndNewIdIsProvided_ShouldUpdateLayoutSetWithNewIdAndChangeFolderName()
    {
        // Arrange
        string oldLayoutSetName = "layoutSet1";
        string newLayoutSetName = "newLayoutSet";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        AltinnRepoEditingContext altinnRepoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            _org,
            targetRepository,
            _developer
        );
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );

        // Act

        List<string> layoutSetFileNamesBeforeUpdate = GetFileNamesInLayoutSet(oldLayoutSetName);

        var updatedLayoutSets = await _appDevelopmentService.UpdateLayoutSetName(
            altinnRepoEditingContext,
            oldLayoutSetName,
            newLayoutSetName
        );
        List<string> layoutSetFileNamesAfterUpdate = GetFileNamesInLayoutSet(newLayoutSetName);

        // Assert
        Assert.Equal(4, updatedLayoutSets.Sets.Count);
        Assert.NotNull(updatedLayoutSets.Sets.Find(set => set.Id == newLayoutSetName));
        Assert.Equal(layoutSetFileNamesBeforeUpdate.Count, layoutSetFileNamesAfterUpdate.Count);
    }

    [Fact]
    public async Task AddLayoutSet_WhenLayoutSetDoesNotExist_ShouldAddNewLayoutSet()
    {
        // Arrange
        var newLayoutSet = new LayoutSetConfig { Id = "newLayoutSet", Tasks = ["newTask"] };
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );

        // Act
        var updatedLayoutSets = await _appDevelopmentService.AddLayoutSet(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
            newLayoutSet
        );

        // Assert
        Assert.NotNull(updatedLayoutSets);
        Assert.Equal(5, updatedLayoutSets.Sets.Count);
        Assert.Contains(newLayoutSet, updatedLayoutSets.Sets);
    }

    [Fact]
    public async Task AddLayoutSet_WhenLayoutSetIdExist_ShouldThrowError()
    {
        // Arrange
        var newLayoutSet = new LayoutSetConfig { Id = "layoutSet1" };
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );

        // Act and Assert
        await Assert.ThrowsAsync<NonUniqueLayoutSetIdException>(async () =>
        {
            await _appDevelopmentService.AddLayoutSet(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
                newLayoutSet
            );
        });
    }

    [Fact]
    public async Task UpdateLayoutSet_WhenAppHasNoLayoutSets_ShouldThrowFileNotFoundException()
    {
        // Arrange
        string repository = "app-without-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            repository,
            _developer,
            targetRepository
        );

        // Act
        Func<Task> act = async () =>
            await _appDevelopmentService.UpdateLayoutSetName(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
                "layoutSet1",
                "someName"
            );

        // Assert
        await Assert.ThrowsAsync<NoLayoutSetsFileFoundException>(act);
    }

    [Fact]
    public async Task AddLayoutSet_WhenAppHasNoLayoutSets_ShouldThrowFileNotFoundException()
    {
        // Arrange
        string repository = "app-without-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            repository,
            _developer,
            targetRepository
        );

        // Act
        Func<Task> act = async () =>
            await _appDevelopmentService.AddLayoutSet(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(_org, targetRepository, _developer),
                new() { Id = "layoutSet1" }
            );

        // Assert
        await Assert.ThrowsAsync<NoLayoutSetsFileFoundException>(act);
    }

    [Fact]
    public async Task GetModelMetadata_WhenV9App_ShouldReadDefaultDataTypeFromSettings()
    {
        // Arrange
        string layoutSetName = "layoutSet1";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            _org,
            targetRepository,
            _developer
        );
        _appVersionServiceMock
            .Setup(s => s.GetAppLibVersion(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(new SemanticVersion(9, 0, 0));

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            _repository,
            _developer,
            targetRepository
        );

        // Act
        await _appDevelopmentService.GetModelMetadata(editingContext, layoutSetName, null);

        // Assert: v9 reads defaultDataType from Settings.json
        _schemaModelServiceMock.Verify(
            s =>
                s.GenerateModelMetadataFromJsonSchema(
                    editingContext,
                    "App/models/datamodel.schema.json",
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private List<string> GetFileNamesInLayoutSet(string layoutSetName)
    {
        string[] layoutSetFileNamesPaths = Directory.GetFiles(
            Path.Combine(CreatedTestRepoPath, "App", "ui", layoutSetName, "layouts")
        );
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
