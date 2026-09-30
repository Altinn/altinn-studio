using Altinn.Studio.AppConfig.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.AppConfig.CSharp;

/// <summary>
/// Locates option-list ids registered in C#: non-abstract classes implementing
/// <c>IAppOptionsProvider</c> / <c>IInstanceAppOptionsProvider</c>, directly, through a base class
/// in the app or by being registered as one, whose <c>Id</c> is a string literal, a string constant or
/// <c>nameof(…)</c> set on the property or in a constructor, and the registration helpers
/// <see cref="OptionsRegistrationScanner"/> knows. A provider whose id can't be read that way is
/// recorded without one.
/// </summary>
internal static class OptionProviderScanner
{
    private const int MaxBaseDepth = 8;

    private static readonly HashSet<string> _providerInterfaces = new(StringComparer.Ordinal)
    {
        "IAppOptionsProvider",
        "IInstanceAppOptionsProvider",
    };

    private sealed record DeclaredType(string File, TypeDeclarationSyntax Syntax);

    private sealed record IdSource(string File, ExpressionSyntax Expression, string Id);

    public static void Collect(IReadOnlyList<(string File, SyntaxNode Root)> sources, AppModelBuilder app)
    {
        var ordered = sources.OrderBy(s => s.File, StringComparer.Ordinal).ToList();
        var constants = StringConstants.Collect(ordered.Select(s => s.Root));
        var types = ordered
            .SelectMany(s =>
                s.Root.DescendantNodes().OfType<TypeDeclarationSyntax>().Select(t => new DeclaredType(s.File, t))
            )
            .ToList();
        var typesByName = types.ToLookup(t => t.Syntax.Identifier.ValueText, StringComparer.Ordinal);
        var baseTypeNames = types
            .SelectMany(t => t.Syntax.BaseList?.Types.Select(b => SimpleName(b.Type)) ?? [])
            .ToHashSet(StringComparer.Ordinal);

        foreach (var type in types)
        {
            if (type.Syntax.Modifiers.Any(SyntaxKind.AbstractKeyword) || !IsProvider(type.Syntax, typesByName, 0))
                continue;
            var source = IdOf(type, typesByName, constants, 0);
            if (source is not null || !baseTypeNames.Contains(type.Syntax.Identifier.ValueText))
                Record(app, type, source);
        }

        foreach (var (file, root) in ordered)
        {
            CollectRegisteredTypes(file, root, typesByName, constants, app);
            OptionsRegistrationScanner.Collect(file, root, constants, app);
        }
    }

    private static void CollectRegisteredTypes(
        string file,
        SyntaxNode root,
        ILookup<string, DeclaredType> typesByName,
        StringConstants constants,
        AppModelBuilder app
    )
    {
        foreach (var registration in root.DescendantNodes().OfType<GenericNameSyntax>())
        {
            if (
                registration.Parent is not (InvocationExpressionSyntax or MemberAccessExpressionSyntax)
                || registration.TypeArgumentList.Arguments is not [var service, var implementation]
                || !_providerInterfaces.Contains(SimpleName(service))
            )
                continue;
            var name = SimpleName(implementation);
            var declared = typesByName[name].ToList();
            if (declared.Count == 0)
            {
                if (!OptionsRegistrationScanner.RecordLibraryProvider(name, registration, file, app))
                    app.OptionsProvidersWithUnknownId.Add(
                        new OptionsProviderWithUnknownId(name, RoslynSyntaxIntrospector.SpanOf(registration, file))
                    );
                continue;
            }
            if (declared.Any(t => IsProvider(t.Syntax, typesByName, 0)))
                continue;
            foreach (var type in declared)
                Record(app, type, IdOf(type, typesByName, constants, 0));
        }
    }

    private static void Record(AppModelBuilder app, DeclaredType type, IdSource? source)
    {
        var name = type.Syntax.Identifier.ValueText;
        if (source is null)
            app.OptionsProvidersWithUnknownId.Add(
                new OptionsProviderWithUnknownId(name, RoslynSyntaxIntrospector.SpanOf(type.Syntax, type.File))
            );
        else
            app.OptionsProviders.TryAdd(
                source.Id,
                new OptionsProvider(source.Id, name, RoslynSyntaxIntrospector.SpanOf(source.Expression, source.File))
            );
    }

    private static bool IsProvider(TypeDeclarationSyntax type, ILookup<string, DeclaredType> typesByName, int depth) =>
        depth <= MaxBaseDepth
        && type.BaseList is { } baseList
        && baseList.Types.Any(b =>
            _providerInterfaces.Contains(SimpleName(b.Type))
            || typesByName[SimpleName(b.Type)]
                .Any(t => !ReferenceEquals(t.Syntax, type) && IsProvider(t.Syntax, typesByName, depth + 1))
        );

    private static IdSource? IdOf(
        DeclaredType type,
        ILookup<string, DeclaredType> typesByName,
        StringConstants constants,
        int depth
    )
    {
        if (depth > MaxBaseDepth)
            return null;
        foreach (var expression in IdExpressions(type.Syntax))
            if (constants.Evaluate(expression) is { Length: > 0 } id)
                return new IdSource(type.File, expression, id);
        if (type.Syntax.BaseList is null)
            return null;
        var baseTypes = type.Syntax.BaseList.Types.SelectMany(b => typesByName[SimpleName(b.Type)]);
        foreach (var declared in baseTypes)
            if (
                !ReferenceEquals(declared.Syntax, type.Syntax)
                && IdOf(declared, typesByName, constants, depth + 1) is { } inherited
            )
                return inherited;
        return null;
    }

    private static IEnumerable<ExpressionSyntax> IdExpressions(TypeDeclarationSyntax type)
    {
        foreach (var property in type.Members.OfType<PropertyDeclarationSyntax>())
        {
            if (property.Identifier.ValueText != "Id")
                continue;
            if (property.Initializer is { Value: var initializer })
                yield return initializer;
            if (property.ExpressionBody is { Expression: var body })
                yield return body;
            foreach (var getter in property.AccessorList?.Accessors ?? default)
            {
                if (!getter.IsKind(SyntaxKind.GetAccessorDeclaration))
                    continue;
                if (getter.ExpressionBody is { Expression: var getterBody })
                    yield return getterBody;
                foreach (var returned in getter.Body?.Statements.OfType<ReturnStatementSyntax>() ?? [])
                    if (returned.Expression is { } value)
                        yield return value;
            }
        }
        var constructorAssignments = type
            .Members.OfType<ConstructorDeclarationSyntax>()
            .SelectMany(c => c.DescendantNodes().OfType<AssignmentExpressionSyntax>());
        foreach (var assignment in constructorAssignments)
            if (
                assignment.Left
                is IdentifierNameSyntax { Identifier.ValueText: "Id" }
                    or MemberAccessExpressionSyntax
                    {
                        Expression: ThisExpressionSyntax,
                        Name.Identifier.ValueText: "Id",
                    }
            )
                yield return assignment.Right;
    }

    private static string SimpleName(TypeSyntax t) =>
        t switch
        {
            QualifiedNameSyntax q => q.Right.Identifier.Text,
            GenericNameSyntax g => g.Identifier.Text,
            IdentifierNameSyntax i => i.Identifier.Text,
            _ => t.ToString(),
        };
}
