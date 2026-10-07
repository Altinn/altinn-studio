using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class GeneratedTypeReferenceFinalizerTests : IDisposable
{
    private readonly TempAppFolder _app = new();
    private readonly AdhocWorkspace _workspace = new();
    private string AppFolder => Path.Combine(_app.Root, "App");
    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;
    private const string TokenName = "System.Threading.CancellationToken";
    private static readonly Lazy<MetadataReference> _emptySdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", "")
    );

    public void Dispose()
    {
        _workspace.Dispose();
        _app.Dispose();
    }

    // Only the placeholder is migration-generated. Existing qualified references deliberately have no marker.
    private CSharpSourceScanner Rewrite(string fullName = TokenName)
    {
        var scanner = new CSharpSourceScanner(AppFolder);
        foreach (var file in scanner.Files.ToArray())
        {
            var references = file
                .Root.DescendantNodes()
                .OfType<IdentifierNameSyntax>()
                .Where(static name => name.Identifier.ValueText == "Generated")
                .ToArray();
            if (references.Length > 0)
            {
                scanner.Update(
                    file,
                    file.Root.ReplaceNodes(
                        references,
                        (_, node) => GeneratedTypeReferenceFinalizer.Reference(fullName).WithTriviaFrom(node)
                    )
                );
            }
        }

        return scanner;
    }

    private Project Project(MetadataReference? sdk = null, params string[] symbols)
    {
        var compilation = SemanticScannerFactory.Compile(AppFolder, sdk ?? _emptySdk.Value, symbols);
        var id = ProjectId.CreateNewId();
        var solution = _workspace.CurrentSolution.AddProject(
            ProjectInfo.Create(
                id,
                VersionStamp.Create(),
                "App",
                "App",
                LanguageNames.CSharp,
                compilationOptions: compilation.Options,
                parseOptions: CSharpParseOptions.Default.WithPreprocessorSymbols(symbols),
                metadataReferences: compilation.References
            )
        );
        foreach (var tree in compilation.SyntaxTrees)
        {
            solution = solution.AddDocument(
                DocumentId.CreateNewId(id),
                Path.GetFileName(tree.FilePath),
                SourceText.From(File.ReadAllText(tree.FilePath)),
                filePath: tree.FilePath
            );
        }

        return solution.GetProject(id) ?? throw new InvalidOperationException("Test project was not created.");
    }

    private CSharpCompilation AssertCompiles(MetadataReference? sdk = null, params string[] symbols)
    {
        var compilation = SemanticScannerFactory.Compile(AppFolder, sdk ?? _emptySdk.Value, symbols);
        Assert.Empty(
            compilation
                .GetDiagnostics(CancellationToken)
                .Where(static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
        );
        return compilation;
    }

    [Fact]
    public async Task TargetType_IsImported_OnlyAtTheGeneratedExpression_PreservingHeaderAndLineEndings()
    {
        var sdk = SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            namespace Library;
            public record Authentication
            {
                public static Authentication Default() => new();
            }
            """
        );
        _app.Write(
            "App.cs",
            "// Application header\r\n\r\nclass App\r\n{\r\n    object Value() => Generated.Default();\r\n    global::Library.Authentication Existing() => new();\r\n}\r\n"
        );
        var scanner = Rewrite("Library.Authentication");

        var changed = (
            await GeneratedTypeReferenceFinalizer.FinalizeAsync(
                scanner,
                [Project(sdk, "DEBUG"), Project(sdk)],
                CancellationToken
            )
        ).ChangedFiles;

        Assert.Equal(1, changed);
        var text = _app.Read("App.cs");
        Assert.StartsWith("// Application header\r\n", text);
        Assert.DoesNotContain("\n", text.Replace("\r\n", "", StringComparison.Ordinal));
        Assert.Contains("using Library;", text);
        Assert.Contains("Authentication.Default()", text);
        Assert.Contains("global::Library.Authentication Existing()", text);
        AssertCompiles(sdk);
        Assert.Equal(
            0,
            (
                await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project(sdk)], CancellationToken)
            ).ChangedFiles
        );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MissingTargetOrUnresolvedType_LeavesTheGeneratedReferenceQualified(bool missingTarget)
    {
        _app.Write("App.cs", "class App { Generated Value() => default; }");
        var scanner = Rewrite("Library.Unavailable");
        var before = _app.Read("App.cs");

        Assert.Equal(
            0,
            (
                await GeneratedTypeReferenceFinalizer.FinalizeAsync(
                    scanner,
                    missingTarget ? [] : [Project()],
                    CancellationToken
                )
            ).ChangedFiles
        );
        Assert.Equal(before, _app.Read("App.cs"));
    }

    [Theory]
    [InlineData("\t", "\n", null)]
    [InlineData("  ", "\r\n", null)]
    [InlineData("\t", "\r\n", "\t")]
    [InlineData("  ", "\n", "  ")]
    [InlineData("  ", "\n", "")]
    public async Task Formatting_PreservesExistingLayout_AndFormatsNewImports(
        string indentation,
        string newline,
        string? namespaceIndentation
    )
    {
        var classIndent = namespaceIndentation ?? "";
        var memberIndent = classIndent + indentation;
        var source =
            (namespaceIndentation is not null ? "namespace Example\n{\n" : "")
            + classIndent
            + "using System;\n\n"
            + classIndent
            + "class App\n"
            + classIndent
            + "{\n"
            + memberIndent
            + "int Other() => 2;\n\n"
            + memberIndent
            + "Generated Token()  =>  default;\n\n"
            + memberIndent
            + "int Third() => 3;\n"
            + classIndent
            + "}\n"
            + (namespaceIndentation is not null ? "}\n" : "");
        source = source.Replace("\n", newline, StringComparison.Ordinal);
        _app.Write("App.cs", source);
        var scanner = Rewrite();

        var result = await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project()], CancellationToken);

        Assert.Equal(1, result.ChangedFiles);
        AssertCompiles();
        var expected = source
            .Replace("Generated", "CancellationToken", StringComparison.Ordinal)
            .Replace(
                "using System;",
                "using System;" + newline + classIndent + "using System.Threading;",
                StringComparison.Ordinal
            );
        Assert.Equal(expected, _app.Read("App.cs"));
    }

    [Fact]
    public async Task MultipleFiles_AreFinalized_WithoutChangingUnmarkedFiles()
    {
        _app.Write("First.cs", "class First { public Generated Token() => default; }");
        _app.Write("Second.cs", "class Second { Generated Token() => new First().Token(); }");
        const string untouched = "class Existing { global::System.Threading.CancellationToken Token() => default; }";
        _app.Write("Existing.cs", untouched);
        var scanner = Rewrite();

        var result = await GeneratedTypeReferenceFinalizer.FinalizeAsync(
            scanner,
            [Project(null, "DEBUG"), Project()],
            CancellationToken
        );

        Assert.Equal(2, result.ChangedFiles);
        foreach (var file in new[] { "First.cs", "Second.cs" })
        {
            var text = _app.Read(file);
            Assert.Contains("using System.Threading;", text);
            Assert.Contains("CancellationToken Token()", text);
            Assert.DoesNotContain("global::", text);
        }
        Assert.Equal(untouched, _app.Read("Existing.cs"));
        AssertCompiles(null, "DEBUG");
        AssertCompiles();
    }

    [Fact]
    public async Task AppTypeShadowingTheFullyQualifiedDependency_IsNotTreatedAsTheIntendedType()
    {
        var sdk = SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            "namespace Library { public class Token { } }"
        );
        _app.Write(
            "App.cs",
            "class App { Generated Token() => default; } namespace Library { public class Token { } }"
        );
        var scanner = Rewrite("Library.Token");
        var before = _app.Read("App.cs");

        Assert.Equal(
            0,
            (
                await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project(sdk)], CancellationToken)
            ).ChangedFiles
        );
        Assert.Equal(before, _app.Read("App.cs"));
    }

    [Fact]
    public async Task UnrelatedCompileError_DoesNotPreventSimplifyingAVerifiedType()
    {
        _app.Write("App.cs", "class App { Unknown ManualFix; Generated Token() => default; }");
        var scanner = Rewrite();

        Assert.Equal(
            1,
            (await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project()], CancellationToken)).ChangedFiles
        );
        var compilation = SemanticScannerFactory.Compile(AppFolder, _emptySdk.Value);
        var error = Assert.Single(
            compilation
                .GetDiagnostics(CancellationToken)
                .Where(static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
        );
        Assert.Equal("CS0246", error.Id);
        Assert.Contains("Unknown", error.GetMessage(System.Globalization.CultureInfo.InvariantCulture));
        Assert.Contains("CancellationToken Token()", _app.Read("App.cs"));
    }

    [Fact]
    public async Task ImportConflictingWithANewTargetDependency_PreservesTheExistingType()
    {
        // System.Threading.Lock was added after the v8 app's net8 target. Its presence must be
        // considered when deciding whether the generated CancellationToken permits a new import.
        _app.Write(
            "App.cs",
            """
            using AppLocks;
            class App
            {
                Lock Existing = new();
                Generated Token() => default;
            }
            namespace AppLocks { public class Lock { } }
            """
        );
        var scanner = Rewrite();

        await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project()], CancellationToken);

        var compilation = AssertCompiles();
        var tree = compilation.SyntaxTrees.Single();
        var field = (await tree.GetRootAsync(CancellationToken))
            .DescendantNodes()
            .OfType<FieldDeclarationSyntax>()
            .Single();
        Assert.Equal(
            "AppLocks.Lock",
            compilation
                .GetSemanticModel(tree)
                .GetTypeInfo(field.Declaration.Type, CancellationToken)
                .Type?.ToDisplayString()
        );
        Assert.DoesNotContain("using System.Threading;", _app.Read("App.cs"));
    }

    [Fact]
    public async Task ImportThatWouldBreakAnUnusedNestedAlias_IsRejected()
    {
        _app.Write(
            "App.cs",
            """
            using AppLocks;
            class App { Generated Token() => default; }
            namespace Other
            {
                using MyLock = Lock;
                class Whatever { }
            }
            namespace AppLocks { public class Lock { } }
            """
        );
        var scanner = Rewrite();
        AssertCompiles();

        await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project()], CancellationToken);

        AssertCompiles();
        Assert.Contains("using MyLock = Lock;", _app.Read("App.cs"));
        Assert.DoesNotContain("using System.Threading;", _app.Read("App.cs"));
    }

    [Theory]
    [InlineData("public static string GetSafeWaitHandle<T>(this T handle) => \"app\";")]
    [InlineData("public static string GetSafeWaitHandle(this object handle) => \"app\";")]
    public async Task ImportThatWouldRebindAnExtensionCall_IsRejected(string extension)
    {
        _app.Write("Extensions.cs", "namespace AppExtensions; public static class Handles { " + extension + " }");
        var path = _app.Write(
            "App.cs",
            """
            using AppExtensions;
            class App
            {
                System.Threading.WaitHandle handle = new System.Threading.ManualResetEvent(false);
                object Handle() => handle.GetSafeWaitHandle();
                Generated Token() => default;
            }
            """
        );
        var scanner = Rewrite();

        await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project()], CancellationToken);

        var compilation = AssertCompiles();
        var tree = compilation.SyntaxTrees.Single(tree => tree.FilePath == path);
        var call = (await tree.GetRootAsync(CancellationToken))
            .DescendantNodes()
            .OfType<InvocationExpressionSyntax>()
            .Single();
        var bound = compilation.GetSemanticModel(tree).GetSymbolInfo(call, CancellationToken).Symbol;
        Assert.Equal("AppExtensions.Handles", bound?.ContainingType.ToDisplayString());
    }

    [Theory]
    [InlineData(
        "using System = Shadow; using CancellationToken = Shadow.Threading; namespace Shadow { public class Threading { } } class App",
        true
    )]
    [InlineData("class App<CancellationToken>", false)]
    public async Task ShadowedTypeOrNamespace_PreservesTheIntendedFrameworkType(string declaration, bool needsGlobal)
    {
        _app.Write("App.cs", declaration + " { Generated Token() => default; }");
        var scanner = Rewrite();

        await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project()], CancellationToken);

        var compilation = AssertCompiles();
        var tree = compilation.SyntaxTrees.Single();
        var method = (await tree.GetRootAsync(CancellationToken))
            .DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .Single();
        Assert.Equal(
            TokenName,
            compilation.GetSemanticModel(tree).GetTypeInfo(method.ReturnType, CancellationToken).Type?.ToDisplayString()
        );
        if (needsGlobal)
        {
            Assert.Contains("global::" + TokenName, _app.Read("App.cs"));
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ConditionalDeclaration_AfterAMemberOrInAnotherFile_KeepsQualification(bool separateFile)
    {
        var source = "class First { }\n#if !DEBUG\nclass CancellationToken { }\n#endif\n";
        _app.Write("App.cs", (separateFile ? "" : source) + "class App { Generated Token() => default; }");
        if (separateFile)
        {
            _app.Write("Conditional.cs", source);
        }
        var scanner = Rewrite();
        var before = _app.Read("App.cs");

        Assert.Equal(
            0,
            (
                await GeneratedTypeReferenceFinalizer.FinalizeAsync(
                    scanner,
                    [Project(null, "DEBUG"), Project()],
                    CancellationToken
                )
            ).ChangedFiles
        );
        Assert.Equal(before, _app.Read("App.cs"));
        AssertCompiles(null, "DEBUG");
        AssertCompiles();
    }

    [Fact]
    public async Task DifferentTargetReferences_MustAgreeOnTheFinalSpelling()
    {
        var debugSdk = SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            "namespace Library { public class Token { } }"
        );
        var releaseSdk = SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            "namespace Library { public class Token { } public class Lock { } }"
        );
        _app.Write(
            "App.cs",
            "using AppLocks; class App { Lock Existing = new(); Generated Token() => default; } namespace AppLocks { public class Lock { } }"
        );
        var scanner = Rewrite("Library.Token");
        var before = _app.Read("App.cs");

        Assert.Equal(
            0,
            (
                await GeneratedTypeReferenceFinalizer.FinalizeAsync(
                    scanner,
                    [Project(debugSdk, "DEBUG"), Project(releaseSdk)],
                    CancellationToken
                )
            ).ChangedFiles
        );
        Assert.Equal(before, _app.Read("App.cs"));
        AssertCompiles(debugSdk, "DEBUG");
        AssertCompiles(releaseSdk);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LateSourceWrite_BeforeOrAfterProjectLoad_IsPreserved(bool afterLoad)
    {
        _app.Write("App.cs", "class App { Generated Token() => default; }");
        var scanner = Rewrite();
        Project? project = afterLoad ? Project() : null;
        var changed = _app.Read("App.cs") + "\n// Written by a later migration\n";
        _app.Write("App.cs", changed);
        project ??= Project();

        Assert.Equal(
            0,
            (await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [project], CancellationToken)).ChangedFiles
        );
        Assert.Equal(changed, _app.Read("App.cs"));
    }

    [Fact]
    public async Task FileExcludedFromOneConfiguration_IsNotSimplified()
    {
        _app.Write("App.cs", "class App { Generated Token() => default; }");
        var scanner = Rewrite();
        var debug = Project(null, "DEBUG");
        var release = Project();
        release = release.RemoveDocument(release.DocumentIds.Single());
        var before = _app.Read("App.cs");

        Assert.Equal(
            0,
            (
                await GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [debug, release], CancellationToken)
            ).ChangedFiles
        );
        Assert.Equal(before, _app.Read("App.cs"));
    }

    [Fact]
    public async Task Cancellation_IsNotSwallowed()
    {
        _app.Write("App.cs", "class App { Generated Token() => default; }");
        var scanner = Rewrite();
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            GeneratedTypeReferenceFinalizer.FinalizeAsync(scanner, [Project()], cancellation.Token)
        );
    }
}
