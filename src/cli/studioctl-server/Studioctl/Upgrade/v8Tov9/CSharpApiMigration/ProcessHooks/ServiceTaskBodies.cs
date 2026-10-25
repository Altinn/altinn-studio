using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// H-SVC: an app's v8 <c>IServiceTask.Execute(ServiceTaskContext)</c>; its Storage calls use
/// <c>context.InstanceDataMutator</c>, which v8 already passes and v9's <c>StageContext</c> keeps.
/// </summary>
internal static class ServiceTaskBodies
{
    private const string ServiceTask = "Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.IServiceTask";

    public static IEnumerable<WindowEntry> Find(IReadOnlyList<ScannedCSharpFile> files)
    {
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

                foreach (
                    var member in type
                        .AllInterfaces.Where(static contract =>
                            contract.ToDisplayString() == ServiceTask
                            && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
                        )
                        .SelectMany(static contract => contract.GetMembers("Execute"))
                        .OfType<IMethodSymbol>()
                )
                {
                    if (
                        type.FindImplementationForInterfaceMember(member) is not IMethodSymbol implementation
                        || CSharpSemanticQueries.IsAltinnAppSymbol(implementation)
                        || implementation.Parameters is not [var context]
                        || !seen.Add(implementation.OriginalDefinition)
                        || SyntaxEditing.Locate(implementation.OriginalDefinition, filesByTree)
                            is not var (methodFile, method)
                    )
                    {
                        continue;
                    }

                    yield return new WindowEntry(
                        WindowEntryKind.ServiceTask,
                        implementation.OriginalDefinition,
                        method,
                        methodFile,
                        null,
                        context.OriginalDefinition,
                        true,
                        null
                    );
                }
            }
        }
    }

    /// <summary>
    /// A moved write from which a failure result is returned later in <c>Execute</c>; v9 keeps nothing from an
    /// attempt that fails.
    /// </summary>
    public static IEnumerable<SyntaxNode> FailuresAfter(WindowEntry entry, SyntaxNode write)
    {
        var body = (SyntaxNode?)entry.Declaration.Body ?? entry.Declaration.ExpressionBody;
        if (body is null || entry.File.SemanticModel is not { } model)
        {
            return [];
        }

        return body.DescendantNodes()
            .OfType<ReturnStatementSyntax>()
            .Where(ret =>
                ret.SpanStart > write.SpanStart
                && ret.Expression is InvocationExpressionSyntax invocation
                && model.GetSymbolInfo(invocation).Symbol is IMethodSymbol { Name: var name } method
                && name.StartsWith("Failed", StringComparison.Ordinal)
                && method.ContainingType.Name == "ServiceTaskResult"
            );
    }
}
