using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the <c>UserActionContext(Instance instance, int? userId, ..)</c> constructor, which v9
/// removes. Apps call it mostly from their own unit tests. The remaining constructor takes an
/// <c>IInstanceDataMutator</c>, so there is no mechanical rewrite: the caller has to supply one.
/// </summary>
/// <remarks>
/// Both constructors take the same number of arguments, so without a semantic model a call is reported only when its
/// first argument is clearly an <c>Instance</c>: passed as <c>instance:</c>, created with <c>new Instance</c>, or a
/// name the file declares with the type <c>Instance</c>.
/// </remarks>
internal sealed class RemovedUserActionContextConstructorDetector
{
    private const string ContextTypeName = "UserActionContext";
    private const string InstanceTypeName = "Instance";
    private const string InstanceParameterName = "instance";

    private const string Summary =
        "The UserActionContext constructor taking an Instance is removed in v9. Pass an IInstanceDataMutator "
        + "instead: new UserActionContext(dataMutator, userId, ..), which takes the instance from "
        + "dataMutator.Instance. In a unit test, use a mock or fake IInstanceDataMutator that returns the instance "
        + "and the form data the action reads through context.DataMutator. Call sites found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedUserActionContextConstructorDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel ? SemanticMatches(file, semanticModel) : SyntaxMatches(file)
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }

    private static IEnumerable<CSharpApiMatch> SemanticMatches(ScannedCSharpFile file, SemanticModel semanticModel)
    {
        foreach (var creation in file.Root.DescendantNodes().OfType<BaseObjectCreationExpressionSyntax>())
        {
            // A target-typed new() names no type, so only an explicit creation of another type can be skipped unbound.
            if (creation is ObjectCreationExpressionSyntax explicitCreation && !NamesContextType(explicitCreation))
            {
                continue;
            }

            if (
                semanticModel.GetSymbolInfo(creation).Symbol
                    is IMethodSymbol
                    {
                        MethodKind: MethodKind.Constructor,
                        ContainingType.Name: ContextTypeName,
                        Parameters: [{ Type.Name: InstanceTypeName }, ..],
                    } constructor
                && CSharpSemanticQueries.IsAltinnAppSymbol(constructor)
            )
            {
                yield return Match(file, creation);
            }
        }
    }

    private static IEnumerable<CSharpApiMatch> SyntaxMatches(ScannedCSharpFile file)
    {
        DeclaredTypeReceiverClassifier? instances = null;
        foreach (var creation in file.Root.DescendantNodes().OfType<BaseObjectCreationExpressionSyntax>())
        {
            if (
                CSharpSyntaxQueries.ConstructedTypeName(creation) != ContextTypeName
                || creation.ArgumentList is not { Arguments: [var first, ..] } arguments
            )
            {
                continue;
            }

            instances ??= new DeclaredTypeReceiverClassifier(file, InstanceTypeName);
            var passesInstance =
                arguments.Arguments.Any(static argument =>
                    argument.NameColon?.Name.Identifier.Text == InstanceParameterName
                )
                || (
                    first.NameColon is null
                    && (
                        first.Expression is ObjectCreationExpressionSyntax created
                            && CSharpSyntaxQueries.ConstructedTypeName(created) == InstanceTypeName
                        || instances.IsOfType(first.Expression)
                    )
                );

            if (passesInstance)
            {
                yield return Match(file, creation);
            }
        }
    }

    private static bool NamesContextType(ObjectCreationExpressionSyntax creation) =>
        CSharpSyntaxQueries.ConstructedTypeName(creation) == ContextTypeName;

    private static CSharpApiMatch Match(ScannedCSharpFile file, BaseObjectCreationExpressionSyntax creation) =>
        new(file.RelativePath, file.GetLine(creation), $"new {ContextTypeName}(Instance, ..)");
}
