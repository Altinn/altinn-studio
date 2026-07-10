using Altinn.App.Ai.Enrichment.Orchestration;
using FluentAssertions;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Orchestration;

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
        File.WriteAllText(Path.Combine(_tempDir, "praktisk.ansvarlig_myndig.md"), "# Alder\n");
        File.WriteAllText(Path.Combine(_tempDir, "formalia.soknad_komplett.md"), "# Komplett\n");
        File.WriteAllText(Path.Combine(_tempDir, "praktisk.rom_finnes.md"), "# Rom\n");
        File.WriteAllText(Path.Combine(_tempDir, "readme.txt"), "ignore-me\n");

        var loader = new MarkdownRulesLoader();
        var rules = await loader.LoadAsync(_tempDir);

        rules.Select(r => r.Key).Should().Equal(
            "formalia.soknad_komplett",
            "praktisk.ansvarlig_myndig",
            "praktisk.rom_finnes");

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
