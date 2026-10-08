using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class SourceFilePathsTests
{
    [Fact]
    public void NormalizedExactMatches_KeepDistinctCasing_AndIgnoreCandidateOrder()
    {
        using var app = new TempAppFolder();
        var upper = Path.Combine(app.Root, "Source.cs");
        var lower = Path.Combine(app.Root, "source.cs");
        var normalizedUpper = Path.Combine(app.Root, "nested", "..", "Source.cs");

        var matches = SourceFilePaths.Match([upper, lower], [lower, normalizedUpper], static path => path);

        Assert.Equal(2, matches.Count);
        Assert.Equal(normalizedUpper, matches[upper]);
        Assert.Equal(lower, matches[lower]);
    }

    [Fact]
    public void AmbiguousExactSourceOrTargetPaths_AreNotPaired()
    {
        using var app = new TempAppFolder();
        var path = Path.Combine(app.Root, "Source.cs");
        var equivalent = Path.Combine(app.Root, "nested", "..", "Source.cs");

        Assert.Empty(SourceFilePaths.Match([path, equivalent], [path], static candidate => candidate));
        Assert.Empty(SourceFilePaths.Match([path], [path, equivalent], static candidate => candidate));
    }

    [Fact]
    public void AmbiguousFoldedSourceOrTargetPaths_DoNotStealAnExactMatch()
    {
        using var app = new TempAppFolder();
        var title = app.Write("Source.cs", "class Source { }");
        var lower = Path.Combine(app.Root, "App", "source.cs");
        var upper = Path.Combine(app.Root, "App", "SOURCE.cs");

        Assert.Empty(SourceFilePaths.Match([title, lower], [upper], static candidate => candidate));
        Assert.Empty(SourceFilePaths.Match([upper], [title, lower], static candidate => candidate));
        var matches = SourceFilePaths.Match([title, lower], [title], static candidate => candidate);
        Assert.Equal(title, Assert.Single(matches).Key);
    }

    [Fact]
    public void UniqueExistingCaseVariation_PairsTheScannerWithItsCompiledTree()
    {
        using var app = new TempAppFolder();
        const string source = "class Source { }";
        app.Write("Source.cs", source);
        var varied = Path.Combine(app.Root, "App", "SOURCE.cs");
        if (!(OperatingSystem.IsWindows() || OperatingSystem.IsMacOS()) || !File.Exists(varied))
        {
            Assert.Skip("This filesystem does not support the Windows/macOS case-insensitive path fallback.");
        }

        var tree = CSharpSyntaxTree.ParseText(
            source,
            path: varied,
            cancellationToken: TestContext.Current.CancellationToken
        );
        var scanner = new CSharpSourceScanner(Path.Combine(app.Root, "App"), CSharpCompilation.Create("App", [tree]));

        var model = Assert.IsAssignableFrom<SemanticModel>(Assert.Single(scanner.Files).SemanticModel);
        Assert.Same(tree, model.SyntaxTree);
    }

    [Fact]
    public void DistinctExistingCaseSensitiveFiles_RetainTheirOwnSemanticModels()
    {
        using var app = new TempAppFolder();
        var upper = app.Write("Source.cs", "class Upper { }");
        var lower = Path.Combine(app.Root, "App", "source.cs");
        if (File.Exists(lower))
        {
            Assert.Skip("This filesystem cannot hold two files differing only in case.");
        }
        app.Write("source.cs", "class Lower { }");
        var upperTree = CSharpSyntaxTree.ParseText(
            "class Upper { }",
            path: upper,
            cancellationToken: TestContext.Current.CancellationToken
        );
        var lowerTree = CSharpSyntaxTree.ParseText(
            "class Lower { }",
            path: lower,
            cancellationToken: TestContext.Current.CancellationToken
        );
        var scanner = new CSharpSourceScanner(
            Path.Combine(app.Root, "App"),
            CSharpCompilation.Create("App", [upperTree, lowerTree])
        );

        Assert.Same(
            upperTree,
            Assert
                .IsAssignableFrom<SemanticModel>(scanner.Files.Single(file => file.Path == upper).SemanticModel)
                .SyntaxTree
        );
        Assert.Same(
            lowerTree,
            Assert
                .IsAssignableFrom<SemanticModel>(scanner.Files.Single(file => file.Path == lower).SemanticModel)
                .SyntaxTree
        );
        // Uniqueness in the two input lists is insufficient when the filesystem contains both paths.
        Assert.Empty(SourceFilePaths.Match([upper], [lower], static candidate => candidate));
    }
}
