using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class UiFoldersServiceTests : IDisposable
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string Repo = "app-with-ui-folders";
    private const string OrderedRepo = "app-with-ordered-ui-folders";
    private string _testRepoPath;

    [Fact]
    public async Task GetLayoutSetsExtended_ReturnsLayoutSetMatchingTaskId()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );

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
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );

        // Assert
        Assert.DoesNotContain(result, dto => dto.Id == "orphanFolder");
    }

    [Fact]
    public async Task GetLayoutSetsExtended_ReturnsCorrectDataTypeAndPageCount()
    {
        // Arrange
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext();

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );
        UiFolderLayoutSetDto layoutSet = result.Single(dto => dto.Id == "Task_1");

        // Assert
        Assert.Equal("myModel", layoutSet.DataType);
        Assert.Equal(2, layoutSet.PageCount);
    }

    [Fact]
    public async Task GetLayoutSetsExtended_OrdersByProcessTaskAndPlacesSubformsLast()
    {
        // Arrange: the process defines Task_2 before Task_1, so the result must follow that order rather
        // than the alphabetical folder order, and the subform (which has no task) must come last.
        (AltinnRepoEditingContext editingContext, UiFoldersService service) = await CreateTestContext(OrderedRepo);

        // Act
        IEnumerable<UiFolderLayoutSetDto> result = await service.GetLayoutSetsExtended(
            editingContext,
            CancellationToken.None
        );

        // Assert
        Assert.Equal(["Task_2", "Task_1", "subformSet"], result.Select(dto => dto.Id));
    }

    private async Task<(AltinnRepoEditingContext editingContext, UiFoldersService service)> CreateTestContext(
        string repo = Repo
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );
        UiFoldersService service = new(
            new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory()),
            new Mock<IProcessModelingService>().Object,
            new Mock<IPublisher>().Object,
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
