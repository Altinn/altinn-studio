using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// H-DATACREATION: an app's <c>IInstantiationProcessor.DataCreation(Instance, object, prefill)</c> that reaches a
/// Storage call moves to the overload that gets the instance data mutator, which v9 calls and whose changes it saves.
/// With a data type that is created when its task starts, v9 runs it in the process transition's callback too.
/// </summary>
internal static class DataCreationPort
{
    private const string Processor = "Altinn.App.Core.Features.IInstantiationProcessor";

    /// <summary>The app's implementations of the v8 member, as entries of the transition.</summary>
    public static IEnumerable<WindowEntry> Find(IReadOnlyList<ScannedCSharpFile> files, ProcessHookPortContext context)
    {
        var inCallback = context.DataTypes.Values.Any(static dataType => dataType.AutoCreate);
        var filesByTree = files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        var seen = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var declaration in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (model.GetDeclaredSymbol(declaration) is not { } type)
                {
                    continue;
                }

                foreach (var member in V8Members(type))
                {
                    if (
                        type.FindImplementationForInterfaceMember(member) is not IMethodSymbol implementation
                        || implementation.ContainingType.TypeKind == TypeKind.Interface
                        || CSharpSemanticQueries.IsAltinnAppSymbol(implementation)
                        || !seen.Add(implementation.OriginalDefinition)
                        || SyntaxEditing.Locate(implementation.OriginalDefinition, filesByTree)
                            is not var (methodFile, method)
                        || Blocked(implementation, method)
                    )
                    {
                        continue;
                    }

                    yield return new WindowEntry(
                        WindowEntryKind.DataCreation,
                        implementation.OriginalDefinition,
                        method,
                        methodFile,
                        implementation.Parameters[0].OriginalDefinition,
                        null,
                        inCallback,
                        null
                    );
                }
            }
        }
    }

    /// <summary>The v8 member: <c>DataCreation(Instance, object, Dictionary&lt;string, string&gt;?)</c>.</summary>
    private static IEnumerable<IMethodSymbol> V8Members(INamedTypeSymbol type) =>
        type
            .AllInterfaces.Where(static contract =>
                contract.ToDisplayString() == Processor && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
            )
            .SelectMany(static contract => contract.GetMembers("DataCreation"))
            .OfType<IMethodSymbol>()
            .Where(static member => member.Parameters is [{ Type.Name: "Instance" }, _, _]);

    private static bool Blocked(IMethodSymbol method, MethodDeclarationSyntax declaration) =>
        method.IsVirtual
        || method.IsOverride
        || method.IsAbstract
        || declaration.Modifiers.Any(SyntaxKind.PartialKeyword)
        || declaration.ExplicitInterfaceSpecifier is not null
        || declaration.Body is null && declaration.ExpressionBody is null;
}
