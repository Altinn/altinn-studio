using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

/// <summary>
/// A v8 hook class that a scenario can delete, with its file and its registration, once the app's configuration does
/// its work: deleting them deletes the class and nothing else, and the app still compiles.
/// </summary>
/// <remarks>
/// The class implements nothing but the hook's interface, with no base class or attributes, declared in one part,
/// alone in its file, with no members but fields without initializers, constructors that only assign parameters to
/// fields, the hook method, and at most one other method, the helper. Neither the hook method nor the helper holds a
/// comment or directive, and both have a block body. The file has no code excluded by a preprocessor condition, no
/// assembly attributes and no <c>global using</c>, the class is used nowhere but in its one registration, which is a
/// statement of its own directly in a method's body, and its namespace keeps other members.
/// </remarks>
internal sealed record RemovableHook(
    HookImplementation Hook,
    BlockSyntax Body,
    (MethodDeclarationSyntax Declaration, BlockSyntax Body)? Helper,
    SemanticModel Model,
    HookRegistration Registration,
    StatementSyntax RegistrationStatement
)
{
    public string Path => PortReport.DisplayPath(Hook.File.RelativePath);

    /// <summary>The file and line of the registration.</summary>
    public string RegistrationLocation =>
        $"{PortReport.DisplayPath(Registration.File.RelativePath)}:{Registration.File.GetLine(RegistrationStatement)}";

    public static RemovableHook? Of(
        HookImplementation hook,
        IReadOnlyList<ScannedCSharpFile> files,
        IReadOnlyList<HookRegistration> registrations
    )
    {
        var type = hook.Type;
        if (
            hook
                is not {
                    Declaration: { Body: { } body } method,
                    TypeDeclaration: ClassDeclarationSyntax declaration,
                    File.SemanticModel: { } model,
                }
            || type.DeclaringSyntaxReferences.Length != 1
            || type.BaseType?.SpecialType != SpecialType.System_Object
            || type.AllInterfaces is not [var contract]
            || contract.ToDisplayString() != hook.Family.V8Interface
            || !type.GetAttributes().IsEmpty
            || !IsAloneInItsFile(hook.File.Root, declaration)
            || !NamespaceKeepsOtherMembers(type)
            || HasCommentOrDirective(body)
            || registrations.Where(registration => Equal(registration.Implementation, type)).ToList()
                is not [{ RemovableStatement: { } registrationStatement, Scope: not null } registration]
            || IsUsedElsewhere(type, files, hook.File, declaration, registration)
        )
        {
            return null;
        }

        (MethodDeclarationSyntax Declaration, BlockSyntax Body)? helper = null;
        foreach (var member in declaration.Members)
        {
            switch (member)
            {
                case FieldDeclarationSyntax field
                    when field.Declaration.Variables.All(static variable => variable.Initializer is null):
                case ConstructorDeclarationSyntax constructor when OnlyAssignsFields(constructor, model, type):
                    break;
                case MethodDeclarationSyntax other when other == method:
                    break;
                case MethodDeclarationSyntax other
                    when helper is null && other.Body is { } helperBody && !HasCommentOrDirective(helperBody):
                    helper = (other, helperBody);
                    break;
                default:
                    return null;
            }
        }

        return new RemovableHook(hook, body, helper, model, registration, registrationStatement);
    }

    /// <summary>Deletes the hooks' files and removes their registrations.</summary>
    public static void Remove(CSharpSourceScanner scanner, IReadOnlyCollection<RemovableHook> hooks)
    {
        foreach (var file in hooks.GroupBy(static hook => hook.Registration.File))
        {
            scanner.Update(
                file.Key,
                SyntaxEditing.RemoveLines(file.Key.Root, [.. file.Select(static hook => hook.RegistrationStatement)])
            );
        }

        foreach (var hook in hooks)
        {
            scanner.Remove(hook.Hook.File);
        }
    }

    /// <summary>Whether the constructor only assigns its parameters to fields of the class.</summary>
    private static bool OnlyAssignsFields(
        ConstructorDeclarationSyntax constructor,
        SemanticModel model,
        INamedTypeSymbol type
    ) =>
        constructor.Body is { } body
        && body.Statements.All(statement =>
            model.GetOperation(statement)
                is IExpressionStatementOperation
                {
                    Operation: ISimpleAssignmentOperation
                    {
                        Target: IFieldReferenceOperation { Field: var field },
                        Value: IParameterReferenceOperation,
                    },
                }
            && Equal(field.ContainingType, type)
        );

    /// <summary>
    /// Whether the class is the only declaration in its file, which has no global statements, assembly attributes,
    /// <c>global using</c> or code excluded by a preprocessor condition, so that deleting the file deletes the class and
    /// nothing else.
    /// </summary>
    private static bool IsAloneInItsFile(CompilationUnitSyntax root, ClassDeclarationSyntax declaration) =>
        root.AttributeLists.Count == 0
        && root.Usings.All(static directive => directive.GlobalKeyword.IsKind(SyntaxKind.None))
        && root.DescendantNodes(static node => node is CompilationUnitSyntax or BaseNamespaceDeclarationSyntax)
            .OfType<MemberDeclarationSyntax>()
            .Where(static member => member is not BaseNamespaceDeclarationSyntax)
            .SequenceEqual([declaration])
        && !root.DescendantTrivia(descendIntoTrivia: true)
            .Any(static trivia => trivia.IsKind(SyntaxKind.DisabledTextTrivia));

    /// <summary>
    /// Whether the class's namespace has other members in the app, so that a <c>using</c> of it still compiles without
    /// the class.
    /// </summary>
    private static bool NamespaceKeepsOtherMembers(INamedTypeSymbol type) =>
        type.ContainingNamespace.GetMembers().Any(member => !Equal(member, type));

    /// <summary>
    /// Whether a name outside the class's declaration and its registration refers to the class. No member of the class
    /// can have its name.
    /// </summary>
    private static bool IsUsedElsewhere(
        INamedTypeSymbol type,
        IReadOnlyList<ScannedCSharpFile> files,
        ScannedCSharpFile file,
        ClassDeclarationSyntax declaration,
        HookRegistration registration
    ) =>
        files.Any(other =>
            other
                .Root.DescendantNodes()
                .OfType<SimpleNameSyntax>()
                .Where(name => name.Identifier.ValueText == type.Name)
                .Where(name =>
                    !(other == file && declaration.Span.Contains(name.Span))
                    && !(other == registration.File && registration.Invocation.Span.Contains(name.Span))
                )
                .Any(name => Equal(other.SemanticModel?.GetSymbolInfo(name).Symbol?.OriginalDefinition, type))
        );

    private static bool HasCommentOrDirective(SyntaxNode node) =>
        node.DescendantTrivia(descendIntoTrivia: true)
            .Any(static trivia =>
                trivia.IsDirective
                || trivia.Kind()
                    is SyntaxKind.SingleLineCommentTrivia
                        or SyntaxKind.MultiLineCommentTrivia
                        or SyntaxKind.SingleLineDocumentationCommentTrivia
                        or SyntaxKind.MultiLineDocumentationCommentTrivia
            );

    private static bool Equal(ISymbol? symbol, ISymbol? other) => SymbolEqualityComparer.Default.Equals(symbol, other);
}
