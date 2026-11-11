using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// <c>IInstanceDataMutator.ReplaceFormData&lt;T&gt;</c> takes a class, where <c>IDataClient.UpdateData&lt;T&gt;</c> took
/// any type. A helper that writes a form of its own type parameter gets <c>where T : class</c> for it.
/// </summary>
internal static class ClassConstraints
{
    private static readonly HashSet<string> _formWrites = ["UpdateData", "UpdateFormData"];

    /// <summary>The positions of the method's type parameters that a form it writes through the mutator has as its type.</summary>
    public static IReadOnlyList<int> Needed(MethodRewrite rewrite) =>
        [
            .. rewrite
                .MovedWrites.Where(static write =>
                    write.Client == StorageClient.Data && _formWrites.Contains(write.Name)
                )
                .Select(static write => Written(ReadSemantics.Model(write)))
                .OfType<ITypeParameterSymbol>()
                .Where(static type => type is { TypeParameterKind: TypeParameterKind.Method, IsReferenceType: false })
                .Select(static type => type.Ordinal)
                .Distinct(),
        ];

    /// <summary><paramref name="method"/> with a class constraint on the type parameters at <paramref name="positions"/>.</summary>
    public static MethodDeclarationSyntax Apply(MethodDeclarationSyntax method, IEnumerable<int> positions)
    {
        foreach (var position in positions)
        {
            if (method.TypeParameterList?.Parameters.ElementAtOrDefault(position) is not { } parameter)
            {
                continue;
            }

            var name = parameter.Identifier.ValueText;
            var constraint = SyntaxFactory.ClassOrStructConstraint(SyntaxKind.ClassConstraint);
            var clause = method.ConstraintClauses.FirstOrDefault(clause => clause.Name.Identifier.ValueText == name);
            if (clause is null)
            {
                // The clause goes on the line of the node before it, whose line break it takes over.
                SyntaxNode last =
                    method.ConstraintClauses.Count > 0 ? method.ConstraintClauses[^1] : method.ParameterList;
                var added = SyntaxFactory
                    .TypeParameterConstraintClause(SyntaxFactory.IdentifierName(name))
                    .AddConstraints(constraint)
                    .NormalizeWhitespace()
                    .WithLeadingTrivia(SyntaxFactory.Space)
                    .WithTrailingTrivia(last.GetTrailingTrivia());
                method = method.ReplaceNode(last, last.WithoutTrailingTrivia());
                method = method.AddConstraintClauses(added);
                continue;
            }

            // notnull cannot stand next to class, which implies it.
            var others = clause.Constraints.Where(static other =>
                other is not TypeConstraintSyntax { Type: IdentifierNameSyntax { Identifier.ValueText: "notnull" } }
            );
            method = method.ReplaceNode(
                clause,
                clause
                    .WithConstraints(
                        SyntaxFactory.SeparatedList<TypeParameterConstraintSyntax>([constraint, .. others])
                    )
                    .NormalizeWhitespace()
                    .WithTriviaFrom(clause)
            );
        }

        return method;
    }

    /// <summary>The type of a written model as the code has it, before the conversion to the parameter's type.</summary>
    private static ITypeSymbol? Written(IOperation? model)
    {
        while (model is IConversionOperation { IsImplicit: true } conversion)
        {
            model = conversion.Operand;
        }

        return model?.Type;
    }
}
