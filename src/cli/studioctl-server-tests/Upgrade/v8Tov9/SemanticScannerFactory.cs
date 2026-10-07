using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Builds a <see cref="CSharpSourceScanner"/> whose files carry semantic models, without restoring
/// real packages: SDK surface stubs are compiled into in-memory assemblies whose <em>names</em> match
/// the real ones (<c>Altinn.App.Core</c>), which is what the
/// semantic queries key on. Production takes the same path with the real assemblies via
/// <c>V8CompilationLoader</c>; these tests pin the query logic, not the loader.
/// </summary>
internal static class SemanticScannerFactory
{
    private static readonly Lazy<IReadOnlyList<MetadataReference>> _runtimeReferences = new(static () =>
        (
            AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
            ?? throw new InvalidOperationException("TRUSTED_PLATFORM_ASSEMBLIES not available")
        )
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Select(static path => (MetadataReference)MetadataReference.CreateFromFile(path))
            .ToList()
    );

    /// <summary>Compiles <paramref name="source"/> into an in-memory assembly reference named <paramref name="assemblyName"/>.</summary>
    public static MetadataReference EmitStubAssembly(string assemblyName, string source)
    {
        var compilation = CSharpCompilation.Create(
            assemblyName,
            [CSharpSyntaxTree.ParseText(source)],
            _runtimeReferences.Value,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        using var stream = new MemoryStream();
        var emit = compilation.Emit(stream);
        if (!emit.Success)
        {
            throw new InvalidOperationException(
                $"Stub assembly '{assemblyName}' does not compile:\n"
                    + string.Join("\n", emit.Diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error))
            );
        }

        return MetadataReference.CreateFromImage(stream.ToArray());
    }

    /// <summary>
    /// Scans <paramref name="appFolder"/> (the <c>App/</c> directory) and pairs every file with a
    /// semantic model from a compilation against the given stub SDK references. Asserts the app
    /// compiles, mirroring the production loader's zero-errors gate.
    /// </summary>
    public static CSharpSourceScanner CreateScanner(string appFolder, params MetadataReference[] sdkReferences)
    {
        var compilation = Compile(appFolder, sdkReferences, CSharpParseOptions.Default);

        var errors = compilation.GetDiagnostics().Where(static d => d.Severity == DiagnosticSeverity.Error).ToList();
        Assert.True(errors.Count == 0, "Test app does not compile:\n" + string.Join("\n", errors));

        var scanner = new CSharpSourceScanner(appFolder, compilation);
        Assert.True(scanner.HasSemanticModels);
        return scanner;
    }

    /// <summary>
    /// The compile errors of <paramref name="appFolder"/> against the given stub SDK references, with the
    /// given preprocessor symbols defined — the compiler's own verdict on a migration's output, in the build
    /// configuration under test.
    /// </summary>
    public static IReadOnlyList<Diagnostic> CompileErrors(
        string appFolder,
        MetadataReference sdkReference,
        params string[] preprocessorSymbols
    ) =>
        Compile(appFolder, sdkReference, preprocessorSymbols)
            .GetDiagnostics()
            .Where(static d => d.Severity == DiagnosticSeverity.Error)
            .ToList();

    /// <summary>
    /// The compilation of <paramref name="appFolder"/> against the given stub SDK reference, with the given
    /// preprocessor symbols defined, for assertions about what a migrated file binds to.
    /// </summary>
    public static CSharpCompilation Compile(
        string appFolder,
        MetadataReference sdkReference,
        params string[] preprocessorSymbols
    ) => Compile(appFolder, [sdkReference], CSharpParseOptions.Default.WithPreprocessorSymbols(preprocessorSymbols));

    private static CSharpCompilation Compile(
        string appFolder,
        IEnumerable<MetadataReference> sdkReferences,
        CSharpParseOptions parseOptions
    )
    {
        var trees = Directory
            .EnumerateFiles(appFolder, "*.cs", SearchOption.AllDirectories)
            .Select(path => CSharpSyntaxTree.ParseText(File.ReadAllText(path), parseOptions, path: path))
            .ToList();

        return CSharpCompilation.Create(
            "Altinn.Application",
            trees,
            _runtimeReferences.Value.Concat(sdkReferences),
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
    }
}
