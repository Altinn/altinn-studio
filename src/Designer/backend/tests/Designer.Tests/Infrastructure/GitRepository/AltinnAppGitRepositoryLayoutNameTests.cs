using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository;

/// <summary>
/// The repository checks two different things about a layout or layout set name. Every path it builds
/// rejects a name that could escape the layout folder, on reads as well as on writes. The naming policy
/// for the names Designer creates applies only where a new layout or a new layout set comes into
/// existence, so names a repository already holds stay readable and writable.
/// </summary>
public class AltinnAppGitRepositoryLayoutNameTests : IDisposable
{
    private const string Org = "ttd";
    private const string SourceRepository = "app-with-legacy-layout-names";
    private const string SourceRepositoryWithoutLayoutSets = "app-without-layoutsets";
    private const string Developer = "testUser";
    private const string LayoutSetWithLegacyPageNames = "legacySet";
    private const string LayoutSetWithLongFolderName = "legacy-subform-name-longer-than-28-chars";
    private const string PageNameWithSpace = "Text field";
    private const string PageNameWithDots = "1.Intro";
    private const string PageNameOutsideNamingPolicy = "New page";
    private const string PageNameFollowingNamingPolicy = "NewPage";
    private const string ExistingPage = "Side1";
    private const string ExistingPageInOtherCase = "SIDE1";

    private string _testRepositoryDirectory;

    public static TheoryData<string> NamesThatAreNotSafePathSegments =>
        ["../escaped", "nested/name", "nested\\name", "..", ".", ""];

    // An empty layout set name is left out: it is how an app that does not use layout sets is addressed.
    public static TheoryData<string> LayoutSetNamesThatAreNotSafePathSegments =>
        ["../escaped", "nested/name", "nested\\name", "..", "."];

    [Theory]
    [MemberData(nameof(NamesThatAreNotSafePathSegments))]
    public async Task GetLayout_LayoutNameThatIsNotASafePathSegment_Throws(string layoutName)
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.GetLayout(LayoutSetWithLegacyPageNames, layoutName)
        );
    }

    [Theory]
    [MemberData(nameof(NamesThatAreNotSafePathSegments))]
    public async Task SaveLayout_LayoutNameThatIsNotASafePathSegment_Throws(string layoutName)
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.SaveLayout(LayoutSetWithLegacyPageNames, layoutName, EmptyLayout())
        );
    }

    [Theory]
    [MemberData(nameof(LayoutSetNamesThatAreNotSafePathSegments))]
    public async Task GetFormLayouts_LayoutSetNameThatIsNotASafePathSegment_Throws(string layoutSetName)
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() => repository.GetFormLayouts(layoutSetName));
    }

    [Fact]
    public async Task GetFormLayouts_PageNamesOutsideNamingPolicy_ReturnsEveryPage()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act
        Dictionary<string, JsonNode> formLayouts = await repository.GetFormLayouts(LayoutSetWithLegacyPageNames);

        // Assert
        Assert.Contains(PageNameWithSpace, formLayouts.Keys);
        Assert.Contains(PageNameWithDots, formLayouts.Keys);
    }

    [Fact]
    public async Task SaveLayout_ExistingPageOutsideNamingPolicy_Writes()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        JsonNode layout = await repository.GetLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace);

        // Act
        await repository.SaveLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace, layout);

        // Assert
        Assert.NotNull(await repository.GetLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace));
    }

    [Fact]
    public async Task SaveLayout_NewPageOutsideNamingPolicy_Throws()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.SaveLayout(LayoutSetWithLegacyPageNames, PageNameOutsideNamingPolicy, EmptyLayout())
        );
    }

    [Fact]
    public async Task SaveLayout_NewPageInExistingLayoutSetOutsideNamingPolicy_Writes()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act
        await repository.SaveLayout(LayoutSetWithLongFolderName, "Side2", EmptyLayout());

        // Assert
        Assert.NotNull(await repository.GetLayout(LayoutSetWithLongFolderName, "Side2"));
    }

    [Fact]
    public async Task SaveLayout_NewLayoutSetOutsideNamingPolicy_Throws()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        string newLayoutSetName = new('a', 29);

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.SaveLayout(newLayoutSetName, "Side1", EmptyLayout())
        );
    }

    [Theory]
    [MemberData(nameof(LayoutSetNamesThatAreNotSafePathSegments))]
    public async Task DeleteLayoutSetFolder_LayoutSetNameThatIsNotASafePathSegment_ThrowsAndDeletesNothing(
        string layoutSetName
    )
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        IEnumerable<string> layoutSetsBefore = await repository.GetUiFolders();

        // Act and assert
        Assert.Throws<BadHttpRequestException>(() =>
            repository.DeleteLayoutSetFolder(layoutSetName, CancellationToken.None)
        );
        Assert.Equal(layoutSetsBefore, await repository.GetUiFolders());
    }

    [Fact]
    public async Task SaveLayout_PageDifferingOnlyInCaseFromAnExistingPage_ThrowsAndLeavesItUntouched()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        JsonNode layoutBefore = await repository.GetLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace);

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.SaveLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace.ToUpperInvariant(), EmptyLayout())
        );
        JsonNode layoutAfter = await repository.GetLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace);
        Assert.Equal(layoutBefore.ToJsonString(), layoutAfter.ToJsonString());
    }

    [Fact]
    public async Task CreatePageLayoutFile_NewPageOutsideNamingPolicy_Throws()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.CreatePageLayoutFile(
                LayoutSetWithLegacyPageNames,
                PageNameOutsideNamingPolicy,
                new AltinnPageLayout("https://altinncdn.no/schemas/json/layout/layout.schema.v1.json")
            )
        );
    }

    [Fact]
    public async Task EnsureLayoutWriteIsAllowed_NewPageOutsideNamingPolicy_Throws()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        Assert.Throws<BadHttpRequestException>(() =>
            repository.EnsureLayoutWriteIsAllowed(LayoutSetWithLegacyPageNames, PageNameOutsideNamingPolicy)
        );
    }

    [Fact]
    public async Task EnsureLayoutWriteIsAllowed_PageThatAlreadyExists_DoesNotThrow()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act
        repository.EnsureLayoutWriteIsAllowed(LayoutSetWithLegacyPageNames, PageNameWithSpace);

        // Assert
        Assert.NotNull(await repository.GetLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task SaveLayout_NewPageInAnAppWithoutLayoutSets_Writes(string layoutSetName)
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository(SourceRepositoryWithoutLayoutSets);

        // Act
        await repository.SaveLayout(layoutSetName, PageNameFollowingNamingPolicy, EmptyLayout());

        // Assert
        Assert.NotNull(await repository.GetLayout(layoutSetName, PageNameFollowingNamingPolicy));
    }

    [Fact]
    public async Task SaveLayout_FirstPageOfAnAppWithoutLayoutSets_Writes()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository(SourceRepositoryWithoutLayoutSets);
        TestDataHelper.DeleteDirectory(Path.Combine(_testRepositoryDirectory, "App", "ui"));

        // Act
        await repository.SaveLayout(string.Empty, PageNameFollowingNamingPolicy, EmptyLayout());

        // Assert
        Assert.NotNull(await repository.GetLayout(string.Empty, PageNameFollowingNamingPolicy));
    }

    [Fact]
    public async Task EnsureLayoutWriteIsAllowed_AppWithoutLayoutSetsAndPageOutsideNamingPolicy_Throws()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository(SourceRepositoryWithoutLayoutSets);

        // Act and assert
        Assert.Throws<BadHttpRequestException>(() =>
            repository.EnsureLayoutWriteIsAllowed(string.Empty, PageNameOutsideNamingPolicy)
        );
    }

    [Fact]
    public async Task SaveLayout_NewPageDifferingOnlyInCaseFromAnExistingPage_ThrowsAndWritesNothing()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        string[] layoutFilesBefore = LayoutFileNames(LayoutSetWithLegacyPageNames);
        JsonNode layoutBefore = await repository.GetLayout(LayoutSetWithLegacyPageNames, ExistingPage);

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.SaveLayout(LayoutSetWithLegacyPageNames, ExistingPageInOtherCase, EmptyLayout())
        );
        Assert.Equal(layoutFilesBefore, LayoutFileNames(LayoutSetWithLegacyPageNames));
        JsonNode layoutAfter = await repository.GetLayout(LayoutSetWithLegacyPageNames, ExistingPage);
        Assert.Equal(layoutBefore.ToJsonString(), layoutAfter.ToJsonString());
    }

    [Fact]
    public async Task SaveLayout_NewPageDifferingOnlyInCaseFromAPageWithUpperCaseExtension_ThrowsAndWritesNothing()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        string layoutsPath = Path.Combine(
            _testRepositoryDirectory,
            "App",
            "ui",
            LayoutSetWithLegacyPageNames,
            "layouts"
        );
        string upperCaseExtensionPath = Path.Combine(layoutsPath, $"{ExistingPage}.JSON");
        File.Move(Path.Combine(layoutsPath, $"{ExistingPage}.json"), upperCaseExtensionPath);
        string layoutBefore = File.ReadAllText(upperCaseExtensionPath);
        string[] layoutFilesBefore = LayoutFileNames(LayoutSetWithLegacyPageNames);

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.SaveLayout(LayoutSetWithLegacyPageNames, ExistingPageInOtherCase, EmptyLayout())
        );
        Assert.Equal(layoutFilesBefore, LayoutFileNames(LayoutSetWithLegacyPageNames));
        Assert.Equal(layoutBefore, File.ReadAllText(upperCaseExtensionPath));
    }

    [Fact]
    public async Task CreatePageLayoutFile_NewPageDifferingOnlyInCaseFromAnExistingPage_ThrowsAndWritesNothing()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        string[] layoutFilesBefore = LayoutFileNames(LayoutSetWithLegacyPageNames);

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.CreatePageLayoutFile(
                LayoutSetWithLegacyPageNames,
                ExistingPageInOtherCase,
                new AltinnPageLayout("https://altinncdn.no/schemas/json/layout/layout.schema.v1.json")
            )
        );
        Assert.Equal(layoutFilesBefore, LayoutFileNames(LayoutSetWithLegacyPageNames));
    }

    [Fact]
    public async Task SaveLayout_NewLayoutSetDifferingOnlyInCaseFromAnExistingOne_ThrowsAndWritesNothing()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        string[] layoutFilesBefore = LayoutFileNames(LayoutSetWithLegacyPageNames);
        IEnumerable<string> layoutSetsBefore = await repository.GetUiFolders();

        // Act and assert
        await Assert.ThrowsAsync<BadHttpRequestException>(() =>
            repository.SaveLayout(LayoutSetWithLegacyPageNames.ToUpperInvariant(), "NewPage", EmptyLayout())
        );
        Assert.Equal(layoutSetsBefore, await repository.GetUiFolders());
        Assert.Equal(layoutFilesBefore, LayoutFileNames(LayoutSetWithLegacyPageNames));
    }

    [Fact]
    public async Task EnsureLayoutWritesAreAllowed_TwoNewPagesDifferingOnlyInCase_Throws()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        Assert.Throws<BadHttpRequestException>(() =>
            repository.EnsureLayoutWritesAreAllowed(LayoutSetWithLegacyPageNames, ["NewPage", "NEWPAGE"], [])
        );
    }

    [Fact]
    public async Task EnsureLayoutWritesAreAllowed_NewPageDifferingOnlyInCaseFromADeletedPage_DoesNotThrow()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act
        repository.EnsureLayoutWritesAreAllowed(
            LayoutSetWithLegacyPageNames,
            [ExistingPageInOtherCase],
            [ExistingPage]
        );

        // Assert
        Assert.Contains($"{ExistingPage}.json", LayoutFileNames(LayoutSetWithLegacyPageNames));
    }

    [Fact]
    public async Task UpdateFormLayoutName_ToAnotherPageNameInOtherCase_ThrowsAndRenamesNothing()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();
        string[] layoutFilesBefore = LayoutFileNames(LayoutSetWithLegacyPageNames);

        // Act and assert
        Assert.Throws<BadHttpRequestException>(() =>
            repository.UpdateFormLayoutName(LayoutSetWithLegacyPageNames, PageNameWithDots, ExistingPageInOtherCase)
        );
        Assert.Equal(layoutFilesBefore, LayoutFileNames(LayoutSetWithLegacyPageNames));
    }

    [Fact]
    public async Task UpdateFormLayoutName_ToItsOwnNameInOtherCase_RenamesTheFile()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act
        repository.UpdateFormLayoutName(LayoutSetWithLegacyPageNames, ExistingPage, ExistingPageInOtherCase);

        // Assert
        string[] layoutFilesAfter = LayoutFileNames(LayoutSetWithLegacyPageNames);
        Assert.Contains($"{ExistingPageInOtherCase}.json", layoutFilesAfter);
        Assert.DoesNotContain($"{ExistingPage}.json", layoutFilesAfter);
    }

    /// <summary>
    /// Lists the exact file names in a layout set's layouts folder, in a stable order. Asking the file
    /// system whether a path exists would answer without regard to case on macOS and Windows.
    /// </summary>
    /// <param name="layoutSetName">The name of the layout set to list.</param>
    /// <returns>The file names, with extension.</returns>
    private string[] LayoutFileNames(string layoutSetName) =>
        [
            .. Directory
                .EnumerateFiles(Path.Combine(_testRepositoryDirectory, "App", "ui", layoutSetName, "layouts"))
                .Select(Path.GetFileName)
                .Order(StringComparer.Ordinal),
        ];

    private static JsonNode EmptyLayout() =>
        new JsonObject
        {
            ["$schema"] = "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json",
            ["data"] = new JsonObject { ["layout"] = new JsonArray() },
        };

    private async Task<AltinnAppGitRepository> PrepareRepository(string sourceRepository = SourceRepository)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepositoryDirectory = await TestDataHelper.CopyRepositoryForTest(
            Org,
            sourceRepository,
            Developer,
            targetRepository
        );

        return new AltinnAppGitRepository(
            Org,
            targetRepository,
            Developer,
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            _testRepositoryDirectory
        );
    }

    public void Dispose()
    {
        GC.SuppressFinalize(this);
        if (!string.IsNullOrEmpty(_testRepositoryDirectory))
        {
            TestDataHelper.DeleteDirectory(_testRepositoryDirectory);
        }
    }
}
