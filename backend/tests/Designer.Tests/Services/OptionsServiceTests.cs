using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using LibGit2Sharp;
using Xunit;

namespace Designer.Tests.Services;

public class OptionsServiceTests
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task GetOptionListIds_ShouldReturnOptionListIds_WhenOptionListsExist()
    {
        // Arrange
        const string repo = "app-with-options"; // Has 2 option lists
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        string[] optionListIds = optionsService.GetOptionListIds(Org, targetRepository, Developer);

        // Assert
        Assert.Equal(2, optionListIds.Length);
    }

    [Fact]
    public async Task GetOptionListIds_ShouldReturnEmptyArray_WhenOptionListsDoesNotExist()
    {
        // Arrange
        const string repo = "empty-app"; // Has no option lists
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        string[] optionListIds = optionsService.GetOptionListIds(Org, targetRepository, Developer);

        // Assert
        Assert.Empty(optionListIds);
    }

    [Fact]
    public async Task GetOptions_ShouldReturnOptions_WhenOptionsExists()
    {
        // Arrange
        // This  option list matches the options in 'app-with-options'
        var expectedOptions = new List<Option>
        {
            new Option
            {
                Label = "label1",
                Value = "value1",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        const string repo = "app-with-options";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var fetchedOptions = await optionsService.GetOptions(Org, targetRepository, Developer, optionListId);

        // Assert
        Assert.Equal(expectedOptions.Count, fetchedOptions.Count);

        for (int i = 0; i < expectedOptions.Count; i++)
        {
            Assert.Equal(expectedOptions[i].Label, fetchedOptions[i].Label);
            Assert.Equal(expectedOptions[i].Value, fetchedOptions[i].Value);
            Assert.Equal(expectedOptions[i].Description, fetchedOptions[i].Description);
            Assert.Equal(expectedOptions[i].HelpText, fetchedOptions[i].HelpText);
        }
    }

    [Fact]
    public async Task GetOptions_ShouldThrowNotFoundException_WhenOptionsDoesNotExist()
    {
        // Arrange
        const string repo = "empty-app"; // Has no option lists
        const string optionListId = "test-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        await Assert.ThrowsAsync<NotFoundException>(async () =>
        {
            await optionsService.GetOptions(Org, targetRepository, Developer, optionListId);
        });
    }

    [Fact]
    public async Task UpdateOptions_ShouldReturnUpdatedOptions_WhenOptionsDoesNotExist()
    {
        // Arrange
        var newOptions = new List<Option>
        {
            new Option
            {
                Label = "label1",
                Value = "value1",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        const string repo = "empty-app"; // Has no option lists
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.UpdateOptions(Org, targetRepository, Developer, optionListId, newOptions);

        // Assert
        Assert.Equal(newOptions.Count, updatedOptions.Count);

        for (int i = 0; i < updatedOptions.Count; i++)
        {
            Assert.Equal(newOptions[i].Label, updatedOptions[i].Label);
            Assert.Equal(newOptions[i].Value, updatedOptions[i].Value);
            Assert.Equal(newOptions[i].Description, updatedOptions[i].Description);
            Assert.Equal(newOptions[i].HelpText, updatedOptions[i].HelpText);
        }
    }

    [Fact]
    public async Task UpdateOptions_ShouldReturnUpdatedOptions_WhenOptionsAlreadyExist()
    {
        // Arrange
        var newOptions = new List<Option>
        {
            new Option
            {
                Label = "someNewOption",
                Value = "someNewValue",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        const string repo = "app-with-options";
        const string optionListId = "test-options"; // Name of an existing option list
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.UpdateOptions(Org, targetRepository, Developer, optionListId, newOptions);

        // Assert
        Assert.Equal(updatedOptions.Count, updatedOptions.Count);

        for (int i = 0; i < updatedOptions.Count; i++)
        {
            Assert.Equal(updatedOptions[i].Label, updatedOptions[i].Label);
            Assert.Equal(updatedOptions[i].Value, updatedOptions[i].Value);
            Assert.Equal(updatedOptions[i].Description, updatedOptions[i].Description);
            Assert.Equal(updatedOptions[i].HelpText, updatedOptions[i].HelpText);
        }
    }

    [Fact]
    public async Task DeleteOptions_ShouldDeleteOptions_WhenOptionsExist()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        optionsService.DeleteOptions(Org, targetRepository, Developer, optionListId);

        // Assert
        Assert.True(true); // No exception thrown
    }

    [Fact]
    public async Task DeleteOptions_ShouldThrowNotFoundException_WhenOptionsDoesNotExist()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        Assert.Throws<NotFoundException>(() =>
        {
            optionsService.DeleteOptions(Org, targetRepository, Developer, optionListId);
        });
    }

    [Fact]
    public async Task OptionListExists_ShouldReturnTrue_WhenOptionListExists()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionListExists(Org, targetRepository, Developer, optionListId);

        // Assert
        Assert.True(optionListExists);
    }

    [Fact]
    public async Task OptionListExists_ShouldReturnFalse_WhenOptionListDoesNotExist()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionListExists(Org, targetRepository, Developer, optionListId);

        // Assert
        Assert.False(optionListExists);
    }

    private static OptionsService GetOptionsServiceForTest()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OptionsService optionsService = new(altinnGitRepositoryFactory);

        return optionsService;
    }
}
