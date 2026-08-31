using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Renames the public C# API spellings that v9 corrected to US English: the
/// <c>OrganisationNumber</c>/<c>OrganisationOrPersonIdentifier</c> family, the Maskinporten
/// <c>Organisation</c> properties, the <c>IFileAnalyser</c> family with its <c>Analyse</c> member, the
/// <c>Features.FileAnalyzis</c> namespace segment, <c>InstansiationInstance</c>,
/// <c>AppOptionsServiceExtentions</c>, and <c>AddIndicies</c>. Only compile-time names change; the wire
/// stays as shipped (routes, JSON keys, and telemetry attribute values are pinned in the SDK), so no
/// string literal is ever rewritten.
/// </summary>
/// <remarks>
/// <p>Every rewrite is reported, the same contract as <see cref="CorrespondenceApiMigration"/>.</p>
/// <p>Names fall into two tiers. Distinctive names (<c>IFileAnalyserFactory</c>,
/// <c>InstansiationInstance</c>, …) can only mean the SDK symbol, and renaming even a same-named app
/// symbol along with its references keeps the app compiling, so they are renamed wherever they appear.
/// Ambiguous names (<c>Organisation</c>, <c>OrganisationNumber</c>, <c>Analyse</c>, …) are ones an app
/// plausibly declares itself — often as a serialized form-model property, where a rename would break
/// data binding — so those are renamed only where the token provably binds to an SDK symbol, or where
/// it declares the implementation of an SDK interface member (an app's <c>Analyse</c> on
/// <c>IFileAnalyser</c>). Without a semantic model the ambiguous occurrences are listed for manual
/// review instead of guessed at: a genuine SDK reference that slips through fails to compile against
/// v9, which is loud enough, while renaming an app's own property could corrupt its data contract
/// silently.</p>
/// </remarks>
internal sealed class MisspelledApiMigration
{
    /// <summary>The v8 namespace segment whose using directives the UsingNamespaceMigration step owns.</summary>
    internal const string OldFileAnalysisSegment = "FileAnalyzis";

    /// <summary>
    /// Renames applied wherever the identifier appears: the name is distinctive enough that it can only
    /// refer to the SDK symbol, and none of these shapes carry a serialization contract an app could
    /// break by being renamed alongside.
    /// </summary>
    private static readonly Dictionary<string, string> _distinctiveRenames = new(StringComparer.Ordinal)
    {
        ["AddIndicies"] = "AddIndices",
        ["AppOptionsServiceExtentions"] = "AppOptionsServiceExtensions",
        ["CreateFromOrganisation"] = "CreateFromOrganization",
        ["FileAnalyserFactory"] = "FileAnalyzerFactory",
        [OldFileAnalysisSegment] = "FileAnalysis",
        ["GetFileAnalysers"] = "GetFileAnalyzers",
        ["IFileAnalyser"] = "IFileAnalyzer",
        ["IFileAnalyserFactory"] = "IFileAnalyzerFactory",
        ["InstansiationInstance"] = "InstantiationInstance",
        ["LookUpOrganisation"] = "LookUpOrganization",
        ["LookupOrganisationController"] = "LookupOrganizationController",
        ["LookupOrganisationResponse"] = "LookupOrganizationResponse",
        ["MapFromOrganisation"] = "MapFromOrganization",
        ["OrganisationNumberFormat"] = "OrganizationNumberFormat",
        ["OrganisationOrPersonIdentifier"] = "OrganizationOrPersonIdentifier",
        ["OrganisationOrPersonIdentifierJsonConverter"] = "OrganizationOrPersonIdentifierJsonConverter",
        ["OrganisationSystemUserId"] = "OrganizationSystemUserId",
        ["SetOrganisationName"] = "SetOrganizationName",
        ["SetOrganisationNumber"] = "SetOrganizationNumber",
        ["ToOrganisationNumber"] = "ToOrganizationNumber",
        ["WithOrganisationOrPersonIdentifier"] = "WithOrganizationOrPersonIdentifier",
    };

    /// <summary>
    /// Renames applied only where the token binds to an SDK symbol (or declares the implementation of
    /// an SDK interface member): an app's own <c>OrganisationNumber</c> form-model property is a
    /// serialized name the app owns, and renaming it would break the app's data contract.
    /// </summary>
    private static readonly Dictionary<string, string> _boundRenames = new(StringComparer.Ordinal)
    {
        ["Analyse"] = "Analyze",
        ["AnalyserId"] = "AnalyzerId",
        ["Organisation"] = "Organization",
        ["OrganisationDetails"] = "OrganizationDetails",
        ["OrganisationName"] = "OrganizationName",
        ["OrganisationNumber"] = "OrganizationNumber",
        // Renamed PARAMETERS. Positional arguments need nothing; a named argument
        // (`analyserId: "x"`) binds to the SDK's IParameterSymbol and is renamed here.
        ["analyserId"] = "analyzerId",
        ["analyserIds"] = "analyzerIds",
        ["fileAnalyserFactory"] = "fileAnalyzerFactory",
        ["instansiationInstance"] = "instantiationInstance",
        ["langauge"] = "language",
        ["organisationClient"] = "organizationClient",
        ["organisationName"] = "organizationName",
        ["organisationOrPersonIdentifier"] = "organizationOrPersonIdentifier",
    };

    private readonly CSharpSourceScanner _scanner;

    public MisspelledApiMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var changes = new List<string>();
        var unverified = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var rewriter = new Rewriter(file);
            var updated = rewriter.Visit(file.Root);
            unverified.AddRange(rewriter.Unverified);
            if (rewriter.Changes.Count == 0)
            {
                continue;
            }

            _scanner.Update(file, (CompilationUnitSyntax)updated);
            changes.AddRange(rewriter.Changes);
        }

        var messages = new List<UpgradeMessage>();
        if (changes.Count > 0)
        {
            messages.Warn(
                "Renamed misspelled SDK APIs to their v9 US English spellings. Only C# names changed - "
                    + "routes and JSON keys are unaffected. Rewrites:"
            );
            messages.WarnRange(changes);
        }

        // Unverified names are warnings, not to-dos: most occurrences of an ambiguous name are the
        // app's own symbols, and a genuine SDK reference that slips through fails the build, which
        // is loud enough.
        if (unverified.Count > 0)
        {
            messages.Warn(
                "These occurrences of renamed SDK names could not be verified without a compilation - "
                    + "if one refers to the SDK, apply the US English spelling by hand (for example "
                    + "Organisation -> Organization, Analyse -> Analyze); if it is the app's own symbol, "
                    + "leave it alone:"
            );
            messages.WarnRange(unverified);
        }

        return new MigrationResult(messages);
    }

    private sealed class Rewriter : CSharpSyntaxRewriter
    {
        private readonly ScannedCSharpFile _file;
        private readonly SemanticModel? _semanticModel;

        public Rewriter(ScannedCSharpFile file)
        {
            _file = file;
            _semanticModel = file.SemanticModel;
        }

        public List<string> Changes { get; } = [];

        /// <summary>Ambiguous-name occurrences that could not be classified for lack of a semantic model.</summary>
        public List<string> Unverified { get; } = [];

        public override SyntaxToken VisitToken(SyntaxToken token)
        {
            if (!token.IsKind(SyntaxKind.IdentifierToken) || token.Parent is not { } parent)
            {
                return token;
            }

            if (_distinctiveRenames.TryGetValue(token.ValueText, out var replacement))
            {
                // `using Altinn.App.Core.Features.FileAnalyzis;` is left for the UsingNamespaceMigration
                // step: a file often also imports the correctly spelled sibling namespace (v8 split the
                // types across both), and a token rename here would leave a duplicate using behind where
                // that migration merges them.
                if (
                    token.ValueText == OldFileAnalysisSegment
                    && parent.FirstAncestorOrSelf<UsingDirectiveSyntax>() is not null
                )
                {
                    return token;
                }

                return Rename(token, parent, replacement);
            }

            if (!_boundRenames.TryGetValue(token.ValueText, out replacement))
            {
                return token;
            }

            if (_semanticModel is null)
            {
                Unverified.Add($"{_file.RelativePath}:{_file.GetLine(parent)}: {token.ValueText}");
                return token;
            }

            return BindsToSdkName(_semanticModel, token, parent) ? Rename(token, parent, replacement) : token;
        }

        private SyntaxToken Rename(SyntaxToken token, SyntaxNode parent, string replacement)
        {
            Changes.Add($"{_file.RelativePath}:{_file.GetLine(parent)}: {token.ValueText} -> {replacement}");
            return SyntaxFactory.Identifier(replacement).WithTriviaFrom(token);
        }

        /// <summary>
        /// Whether the token names an SDK symbol — a reference that binds to one, or the declaration of
        /// a member that implements or overrides one. Both sides matter: an app's <c>Analyse</c> method
        /// on the SDK's <c>IFileAnalyser</c> is declared by the app, and a call through the app's own
        /// concrete type binds to the app's method — either would be missed by a plain
        /// declared-in-the-SDK check, and renaming a declaration while leaving its call sites (or the
        /// reverse) would not compile.
        /// </summary>
        private static bool BindsToSdkName(SemanticModel semanticModel, SyntaxToken token, SyntaxNode parent)
        {
            var symbol = parent switch
            {
                SimpleNameSyntax name => Unreduce(BoundSymbol(semanticModel, name)),
                MethodDeclarationSyntax or PropertyDeclarationSyntax => semanticModel.GetDeclaredSymbol(
                    (MemberDeclarationSyntax)parent
                ),
                _ => null,
            };

            return symbol is not null && RefersToSdkMember(symbol, token.ValueText);
        }

        private static ISymbol? BoundSymbol(SemanticModel semanticModel, SimpleNameSyntax name)
        {
            var info = semanticModel.GetSymbolInfo(name);
            return info.Symbol ?? info.CandidateSymbols.FirstOrDefault();
        }

        private static ISymbol? Unreduce(ISymbol? symbol) =>
            symbol is IMethodSymbol method ? method.ReducedFrom ?? method : symbol;

        /// <summary>
        /// Whether <paramref name="symbol"/> is declared by the SDK, overrides an SDK member, or
        /// implements an SDK interface member named <paramref name="name"/>.
        /// </summary>
        private static bool RefersToSdkMember(ISymbol symbol, string name)
        {
            if (CSharpSemanticQueries.IsAltinnAppSymbol(symbol))
            {
                return true;
            }

            for (var overridden = Overridden(symbol); overridden is not null; overridden = Overridden(overridden))
            {
                if (CSharpSemanticQueries.IsAltinnAppSymbol(overridden))
                {
                    return true;
                }
            }

            if (symbol.ContainingType is not { } containingType)
            {
                return false;
            }

            foreach (var contract in containingType.AllInterfaces)
            {
                if (!CSharpSemanticQueries.IsAltinnAppSymbol(contract))
                {
                    continue;
                }

                foreach (var member in contract.GetMembers(name))
                {
                    var implementation = containingType.FindImplementationForInterfaceMember(member);
                    if (SymbolEqualityComparer.Default.Equals(implementation, symbol))
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        private static ISymbol? Overridden(ISymbol symbol) =>
            symbol switch
            {
                IMethodSymbol method => method.OverriddenMethod,
                IPropertySymbol property => property.OverriddenProperty,
                _ => null,
            };
    }
}
