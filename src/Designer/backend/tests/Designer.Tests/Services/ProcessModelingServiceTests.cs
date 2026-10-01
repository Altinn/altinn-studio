using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Moq;
using NuGet.Versioning;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services;

public class ProcessModelingServiceTests : FluentTestsBase<ProcessModelingServiceTests>
{
    private readonly Mock<ISchemaModelService> _schemaModelServiceMock;
    private readonly Mock<IAppVersionService> _appVersionServiceMock;
    private readonly AltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IAppDevelopmentService _appDevelopmentService;
    public string CreatedTestRepoPath { get; set; }

    public ProcessModelingServiceTests()
    {
        _schemaModelServiceMock = new Mock<ISchemaModelService>();
        _appVersionServiceMock = new Mock<IAppVersionService>();
        _appVersionServiceMock
            .Setup(s => s.GetAppLibVersion(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(new SemanticVersion(8, 0, 0));
        _altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(
            TestDataHelper.GetTestDataRepositoriesRootDirectory()
        );
        _appDevelopmentService = new AppDevelopmentService(
            _altinnGitRepositoryFactory,
            _schemaModelServiceMock.Object,
            _appVersionServiceMock.Object
        );
    }

    [Fact]
    public async Task ReconcileRemovedTaskDataTypes_RemovesUnusedGeneratedTypesAndClearsDeletedTaskOwnership()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            "ttd",
            "empty-app",
            "testUser",
            targetRepository
        );
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            "ttd",
            targetRepository,
            "testUser"
        );
        var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            context.Org,
            context.Repo,
            context.Developer
        );
        var metadata = await repository.GetApplicationMetadata();
        metadata.DataTypes =
        [
            new DataType { Id = "deleted", TaskId = "Removed" },
            new DataType
            {
                Id = "shared",
                TaskId = "Removed",
                AllowedContributors = ["custom:contributor"],
                AllowedContentTypes = ["application/pdf"],
                MaxCount = 3,
            },
            new DataType { Id = "released", TaskId = "Removed" },
            new DataType
            {
                Id = "form-data",
                TaskId = "Removed",
                AllowedContributors = ["custom:contributor"],
                MaxCount = 5,
            },
            new DataType { Id = "generated-by-another-task", TaskId = "Removed" },
            new DataType { Id = "kept-owner", TaskId = "Unchanged" },
            new DataType { Id = "unrelated", TaskId = "Unchanged" },
        ];
        await repository.SaveApplicationMetadata(metadata);
        var service = new ProcessModelingService(
            _altinnGitRepositoryFactory,
            _appDevelopmentService,
            _appVersionServiceMock.Object
        );

        await service.ReconcileRemovedTaskDataTypes(
            context,
            ["Removed", "OtherRemoved"],
            ["deleted"],
            new Dictionary<string, string> { ["shared"] = "Remaining", ["kept-owner"] = "Remaining" }
        );

        var saved = await repository.GetApplicationMetadata();
        Assert.Equal(
            ["shared", "released", "form-data", "generated-by-another-task", "kept-owner", "unrelated"],
            saved.DataTypes.Select(dataType => dataType.Id)
        );
        DataType shared = saved.DataTypes.Single(dataType => dataType.Id == "shared");
        Assert.Equal("Remaining", shared.TaskId);
        Assert.Equal(["custom:contributor"], shared.AllowedContributors);
        Assert.Equal(["application/pdf"], shared.AllowedContentTypes);
        Assert.Equal(3, shared.MaxCount);
        Assert.Null(saved.DataTypes.Single(dataType => dataType.Id == "released").TaskId);
        DataType formData = saved.DataTypes.Single(dataType => dataType.Id == "form-data");
        Assert.Null(formData.TaskId);
        Assert.Equal(["custom:contributor"], formData.AllowedContributors);
        Assert.Equal(5, formData.MaxCount);
        Assert.Null(saved.DataTypes.Single(dataType => dataType.Id == "generated-by-another-task").TaskId);
        Assert.Equal("Unchanged", saved.DataTypes.Single(dataType => dataType.Id == "kept-owner").TaskId);
        Assert.Equal("Unchanged", saved.DataTypes.Single(dataType => dataType.Id == "unrelated").TaskId);
    }

    [Fact]
    public async Task ReconcileRemovedTaskDataTypes_WithNothingToChange_LeavesTheFileAsItWas()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            "ttd",
            "empty-app",
            "testUser",
            targetRepository
        );
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            "ttd",
            targetRepository,
            "testUser"
        );
        string metadataPath = Path.Combine(CreatedTestRepoPath, "App", "config", "applicationmetadata.json");
        string original = await File.ReadAllTextAsync(metadataPath);
        var service = new ProcessModelingService(
            _altinnGitRepositoryFactory,
            _appDevelopmentService,
            _appVersionServiceMock.Object
        );

        await service.ReconcileRemovedTaskDataTypes(
            context,
            ["Removed"],
            ["missing"],
            new Dictionary<string, string>()
        );

        Assert.Equal(original, await File.ReadAllTextAsync(metadataPath));
    }

    [Theory]
    [InlineData("ttd", "app-with-process-and-layoutsets", "testUser")]
    public async Task GetTaskTypeFromProcessDefinition_GivenProcessDefinition_ReturnsTaskType(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

        IProcessModelingService processModelingService = new ProcessModelingService(
            _altinnGitRepositoryFactory,
            _appDevelopmentService,
            _appVersionServiceMock.Object
        );

        // Act
        string taskType = await processModelingService.GetTaskTypeFromProcessDefinition(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer),
            "layoutSet1"
        );

        // Assert
        Assert.Equal("data", taskType);
    }
}
