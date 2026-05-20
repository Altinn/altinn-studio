using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using FluentAssertions;

namespace Altinn.Augmenter.Agent.Tests.Unit.Orchestration;

public class MarkdownRulesLoaderTests : IDisposable
{
    private readonly string _tempDir;

    public MarkdownRulesLoaderTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), "augmenter-rules-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempDir, recursive: true); } catch (IOException) { /* ignore cleanup races */ }
    }

    [Fact]
    public async Task LoadAsync_ReturnsAllMdFilesSortedByName()
    {
        File.WriteAllText(Path.Combine(_tempDir, "personkrav.styrer_alder.md"), "# Alder\n");
        File.WriteAllText(Path.Combine(_tempDir, "formelle_krav.soknad_komplett.md"), "# Komplett\n");
        File.WriteAllText(Path.Combine(_tempDir, "vandel.vandel_styrer.md"), "# Vandel\n");
        File.WriteAllText(Path.Combine(_tempDir, "readme.txt"), "ignore-me\n");

        var loader = new MarkdownRulesLoader();
        var rules = await loader.LoadAsync(_tempDir);

        rules.Select(r => r.Key).Should().Equal(
            "formelle_krav.soknad_komplett",
            "personkrav.styrer_alder",
            "vandel.vandel_styrer");

        rules.First().Markdown.Should().Be("# Komplett\n");
    }

    [Fact]
    public async Task LoadAsync_EmptyFolder_ReturnsEmptyList()
    {
        var loader = new MarkdownRulesLoader();
        var rules = await loader.LoadAsync(_tempDir);
        rules.Should().BeEmpty();
    }

    [Fact]
    public async Task LoadAsync_MissingFolder_Throws()
    {
        var loader = new MarkdownRulesLoader();
        var missing = Path.Combine(_tempDir, "does-not-exist");
        var act = () => loader.LoadAsync(missing);
        await act.Should().ThrowAsync<DirectoryNotFoundException>();
    }
}
