#nullable enable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Services.Implementation.Validation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services;

public class AltinnAppServiceResourceServiceTests
{
    private readonly AltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly string _org = "ttd";

    private readonly string _repository = "app-with-resource-metadata";
    private readonly string _developer = "testUser";

    public string? CreatedTestRepoPath { get; set; }

    public AltinnAppServiceResourceServiceTests()
    {
        _altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
    }

    [Fact]
    public async Task GenerateServiceResourceFromApp_ReturnsValidServiceResource()
    {
        // Arrange
        string repository = _repository;
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            repository,
            _developer,
            targetRepository
        );

        var service = new AltinnAppServiceResourceService(_altinnGitRepositoryFactory);

        // Act
        var result = await service.GenerateServiceResourceFromApp(_org, targetRepository, _developer);
        var validationResult = AltinnAppServiceResourceValidator.Validate(result.WithDefaultTranslations());

        // Assert
        Assert.NotNull(result);
        Assert.Equal($"app_{_org}_{_repository}", result.Identifier);
        Assert.True(result.Delegable);
        Assert.NotNull(result.RightDescription);
        Assert.Equal(ResourceType.AltinnApp, result.ResourceType);
        Assert.True(validationResult.Errors.Count == 0);
    }

    [Fact]
    public async Task GenerateServiceResourceFromApp_ReturnsDefaultWithMissingEnglishTranslations()
    {
        // Arrange
        string repository = _repository;
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(
            _org,
            repository,
            _developer,
            targetRepository
        );

        var service = new AltinnAppServiceResourceService(_altinnGitRepositoryFactory);

        // Act
        var result = await service.GenerateServiceResourceFromApp(_org, targetRepository, _developer);

        // Assert
        Assert.NotNull(result);
        Assert.Equal($"app_{_org}_{_repository}", result.Identifier);
        Assert.NotNull(result.Description);
        Assert.Empty(result.Description["en"]);
        Assert.Equal("app-with-resource-metadata description", result.WithDefaultTranslations()?.Description?["en"]);
    }
}
