using System;
using System.Collections.Generic;
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
    private const string Developer = "testUser";
    private const string LayoutSetWithLegacyPageNames = "legacySet";
    private const string LayoutSetWithLongFolderName = "subform-GjennomfoeringsplanDataV7Pdf";
    private const string PageNameWithSpace = "Text field";
    private const string PageNameWithDots = "1.Intro";

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
            repository.SaveLayout(LayoutSetWithLegacyPageNames, "New page", EmptyLayout())
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
            repository.CreatePageLayoutFile(LayoutSetWithLegacyPageNames, "New page", new AltinnPageLayout())
        );
    }

    [Fact]
    public async Task EnsureLayoutCanBeCreatedInSet_NewPageOutsideNamingPolicy_Throws()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act and assert
        Assert.Throws<BadHttpRequestException>(() =>
            repository.EnsureLayoutCanBeCreatedInSet(LayoutSetWithLegacyPageNames, "New page")
        );
    }

    [Fact]
    public async Task EnsureLayoutCanBeCreatedInSet_PageThatAlreadyExists_DoesNotThrow()
    {
        // Arrange
        AltinnAppGitRepository repository = await PrepareRepository();

        // Act
        repository.EnsureLayoutCanBeCreatedInSet(LayoutSetWithLegacyPageNames, PageNameWithSpace);

        // Assert
        Assert.NotNull(await repository.GetLayout(LayoutSetWithLegacyPageNames, PageNameWithSpace));
    }

    private static JsonNode EmptyLayout() =>
        new JsonObject
        {
            ["$schema"] = "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json",
            ["data"] = new JsonObject { ["layout"] = new JsonArray() },
        };

    private async Task<AltinnAppGitRepository> PrepareRepository()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepositoryDirectory = await TestDataHelper.CopyRepositoryForTest(
            Org,
            SourceRepository,
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
