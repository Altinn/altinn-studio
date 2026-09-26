using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for direct references to the app-file service implementations v9 makes internal:
/// <c>AppMetadata</c>, <c>AppOptionsFileHandler</c>, <c>FrontendFeatures</c> and
/// <c>Altinn.App.Core.Internal.Language.ApplicationLanguage</c>. Each is reached through its interface from the
/// container, and an app that constructed or wrapped one has to inject the interface instead.
/// <c>AppResourcesSI</c> is reported by <see cref="RemovedAppResourcesApiDetector"/>.
/// </summary>
/// <remarks>
/// <c>ApplicationLanguage</c> shares its simple name with the <c>Altinn.App.Core.Models.ApplicationLanguage</c>
/// data type, which every app that lists languages uses, so it is only reported with a semantic model that can
/// tell the two apart. The other names are distinctive enough for the syntax-only fallback.
/// </remarks>
internal sealed class InternalizedAppTypeDetector
{
    private const string LanguageServiceNamespace = "Altinn.App.Core.Internal.Language";
    private const string LanguageServiceTypeName = "ApplicationLanguage";

    private static readonly IReadOnlySet<string> _distinctiveTypeNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "AppMetadata",
        "AppOptionsFileHandler",
        "FrontendFeatures",
    };

    private static readonly IReadOnlySet<string> _allTypeNames = new HashSet<string>(
        _distinctiveTypeNames.Append(LanguageServiceTypeName),
        StringComparer.Ordinal
    );

    private const string Summary =
        "The AppMetadata, AppOptionsFileHandler, FrontendFeatures and "
        + "Altinn.App.Core.Internal.Language.ApplicationLanguage classes are internal in v9. Inject IAppMetadata, "
        + "IAppOptionsFileHandler, IFrontendFeatures or IApplicationLanguage instead; code that "
        + "wrapped one of the classes to change its result can wrap the registered service through the container. "
        + "Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public InternalizedAppTypeDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel
                ? SemanticMatches(file, semanticModel)
                : CSharpSyntaxQueries.TypeReferences(file, _distinctiveTypeNames)
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }

    private static IEnumerable<CSharpApiMatch> SemanticMatches(ScannedCSharpFile file, SemanticModel semanticModel)
    {
        foreach (var name in file.Root.DescendantNodes().OfType<SimpleNameSyntax>())
        {
            if (!_allTypeNames.Contains(name.Identifier.Text))
            {
                continue;
            }

            if (
                semanticModel.GetSymbolInfo(name).Symbol is not INamedTypeSymbol type
                || !CSharpSemanticQueries.IsAltinnAppSymbol(type)
            )
            {
                continue;
            }

            if (
                type.Name == LanguageServiceTypeName
                && type.ContainingNamespace?.ToDisplayString() != LanguageServiceNamespace
            )
            {
                continue;
            }

            yield return new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text);
        }
    }
}
