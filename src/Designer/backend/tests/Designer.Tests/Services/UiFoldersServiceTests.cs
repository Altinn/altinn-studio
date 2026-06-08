using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Designer.Tests.Services;

public class UiFoldersServiceTests : IDisposable
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string Repo = "app-with-ui-folders";
    private string _testRepoPath;

    [Fact]
    public async Task GetLayoutSetsExtended_ReturnsLayoutSetMatchingTaskId()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<LayoutSetDto> result = await service.GetLayoutSetsExtended(editingContext, CancellationToken.None);

        // Assert
        Assert.Single(result);
        Assert.Equal("Task_1", result.First().Id);
    }

    [Fact]
    public async Task GetLayoutSetsExtended_ExcludesFolderWithoutMatchingTask()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<LayoutSetDto> result = await service.GetLayoutSetsExtended(editingContext, CancellationToken.None);

        // Assert
        Assert.DoesNotContain(result, dto => dto.Id == "orphanFolder");
    }

    [Fact]
    public async Task GetLayoutSetsExtended_ReturnsCorrectDataTypeAndPageCount()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<LayoutSetDto> result = await service.GetLayoutSetsExtended(editingContext, CancellationToken.None);
        LayoutSetDto layoutSet = result.Single(dto => dto.Id == "Task_1");

        // Assert
        Assert.Equal("myModel", layoutSet.DataType);
        Assert.Equal(2, layoutSet.PageCount);
    }

    private async Task<(AltinnRepoEditingContext editingContext, UiFoldersService service)> CreateTestContext()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );
        UiFoldersService service = new(
            new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory()),
            NullLogger<UiFoldersService>.Instance
        );
        return (editingContext, service);
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(_testRepoPath))
        {
            TestDataHelper.DeleteDirectory(_testRepoPath);
        }
    }
}
