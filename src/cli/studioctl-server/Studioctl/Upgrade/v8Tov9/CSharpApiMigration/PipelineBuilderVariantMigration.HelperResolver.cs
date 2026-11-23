using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PipelineBuilderVariantMigration
{
    /// <summary>
    /// Finds the app's own methods taking or returning the builder that a call reaches: through its symbol when the
    /// semantic model resolves it, and otherwise the way C# looks a method up by name. A bare or <c>this.</c> call
    /// looks in the caller's type and its bases, then for a bare call in its containing types and
    /// <c>using static</c> types; <c>base.</c> looks in the bases; a call through a type name looks in that type;
    /// and a call on the builder looks among extension methods.
    /// </summary>
    private sealed class HelperResolver
    {
        private readonly Dictionary<(SyntaxTree Tree, TextSpan Span), PipelineMethod> _byDeclaration = [];
        private readonly Dictionary<string, List<PipelineMethod>> _byType = new(StringComparer.Ordinal);
        private readonly List<PipelineMethod> _extensions = [];
        private readonly Dictionary<string, List<TypeDeclarationSyntax>> _typesByName = new(StringComparer.Ordinal);
        private readonly Dictionary<string, List<TypeDeclarationSyntax>> _typesByKey = new(StringComparer.Ordinal);
        private readonly List<UsingDirectiveSyntax> _globalStaticUsings = [];

        /// <summary>
        /// The names of the app's fields and properties whose type names the builder, such as a type argument.
        /// </summary>
        public HashSet<string> BuilderMembers { get; } = new(StringComparer.Ordinal);

        public HelperResolver(IEnumerable<ScannedCSharpFile> files, IEnumerable<PipelineMethod> methods)
        {
            foreach (var file in files)
            {
                foreach (var type in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
                {
                    Add(_typesByName, type.Identifier.ValueText, type);
                    Add(_typesByKey, TypeKey(type), type);
                }

                _globalStaticUsings.AddRange(
                    file.Root.Usings.Where(static u => u.GlobalKeyword != default && u.StaticKeyword != default)
                );
                foreach (var member in file.Root.DescendantNodes().OfType<MemberDeclarationSyntax>())
                {
                    switch (member)
                    {
                        case BaseFieldDeclarationSyntax field
                            when BuilderReferences(field.Declaration.Type, file.SemanticModel).Any():
                            BuilderMembers.UnionWith(
                                field.Declaration.Variables.Select(static v => v.Identifier.ValueText)
                            );
                            break;
                        case PropertyDeclarationSyntax property
                            when BuilderReferences(property.Type, file.SemanticModel).Any():
                            BuilderMembers.Add(property.Identifier.ValueText);
                            break;
                    }
                }
            }

            foreach (var method in methods)
            {
                _byDeclaration[(method.Method.SyntaxTree, method.Method.Span)] = method;
                if (method.Method.Parent is TypeDeclarationSyntax type)
                {
                    Add(_byType, TypeKey(type), method);
                }

                if (
                    method.Method.ParameterList.Parameters is [var first, ..]
                    && first.Modifiers.Any(SyntaxKind.ThisKeyword)
                )
                {
                    _extensions.Add(method);
                }
            }
        }

        public IReadOnlyList<PipelineMethod> Resolve(InvocationExpressionSyntax invocation, PipelineMethod caller) =>
            BySymbol(invocation, caller) ?? ByName(invocation, caller);

        private IReadOnlyList<PipelineMethod>? BySymbol(InvocationExpressionSyntax invocation, PipelineMethod caller)
        {
            if (caller.Model is not { } model || model.SyntaxTree != invocation.SyntaxTree)
            {
                return null;
            }

            var info = model.GetSymbolInfo(invocation);
            IEnumerable<ISymbol> symbols = info.Symbol is { } symbol ? [symbol] : info.CandidateSymbols;
            var methods = symbols.OfType<IMethodSymbol>().ToList();
            if (methods.Count == 0)
            {
                return null;
            }

            return
            [
                .. methods
                    .SelectMany(static method =>
                        (method.ReducedFrom ?? method).OriginalDefinition.DeclaringSyntaxReferences
                    )
                    .Select(reference => _byDeclaration.GetValueOrDefault((reference.SyntaxTree, reference.Span)))
                    .OfType<PipelineMethod>()
                    .Distinct(),
            ];
        }

        private IReadOnlyList<PipelineMethod> ByName(InvocationExpressionSyntax invocation, PipelineMethod caller)
        {
            var arguments = invocation.ArgumentList.Arguments.Count;
            var callerType = caller.Method.Parent as TypeDeclarationSyntax;
            switch (invocation.Expression)
            {
                case SimpleNameSyntax name:
                    for (var type = callerType; type is not null; type = type.Parent as TypeDeclarationSyntax)
                    {
                        if (InHierarchy(type, name.Identifier.ValueText, arguments, []) is { } found)
                        {
                            return found;
                        }
                    }

                    // The innermost namespace declaration's usings first, as C# looks.
                    return caller
                            .Method.Ancestors()
                            .OfType<BaseNamespaceDeclarationSyntax>()
                            .SelectMany(static ns => ns.Usings)
                            .Concat(caller.File.Root.Usings)
                            .Where(static u => u.StaticKeyword != default)
                            .Concat(_globalStaticUsings)
                            .SelectMany(u => TypesNamed(u.NamespaceOrType))
                            .Select(type => InHierarchy(type, name.Identifier.ValueText, arguments, []))
                            .FirstOrDefault(static found => found is not null)
                        ?? [];
                case MemberAccessExpressionSyntax { Expression: ThisExpressionSyntax, Name: var name }
                    when callerType is not null:
                    return InHierarchy(callerType, name.Identifier.ValueText, arguments, []) ?? [];
                case MemberAccessExpressionSyntax { Expression: BaseExpressionSyntax, Name: var name }
                    when callerType is not null:
                    return Bases(callerType)
                            .Select(type => InHierarchy(type, name.Identifier.ValueText, arguments, []))
                            .FirstOrDefault(static found => found is not null)
                        ?? [];
                case MemberAccessExpressionSyntax { Expression: var receiver, Name: var name }:
                    var called = name.Identifier.ValueText;
                    // The builder's own methods win over an extension method.
                    if (!_previewMethods.ContainsKey(called) && IsBuilderExpression(receiver, caller, this))
                    {
                        return
                        [
                            .. _extensions.Where(m =>
                                m.Method.Identifier.ValueText == called && Fits(m, arguments + 1)
                            ),
                        ];
                    }

                    if (
                        receiver is IdentifierNameSyntax local
                        && DeclaresLocal(caller.Method, local.Identifier.ValueText)
                    )
                    {
                        return [];
                    }

                    return TypesNamed(receiver)
                            .Select(type => InHierarchy(type, called, arguments, []))
                            .FirstOrDefault(static found => found is not null)
                        ?? [];
                default:
                    return [];
            }
        }

        /// <summary>
        /// The helpers named <paramref name="name"/> that fit the call in the nearest of the type, across its partial
        /// declarations, and its bases.
        /// </summary>
        private List<PipelineMethod>? InHierarchy(
            TypeDeclarationSyntax type,
            string name,
            int arguments,
            HashSet<string> seen
        )
        {
            var key = TypeKey(type);
            if (!seen.Add(key))
            {
                return null;
            }

            if (
                _byType
                    .GetValueOrDefault(key)
                    ?.Where(m => m.Method.Identifier.ValueText == name && Fits(m, arguments))
                    .ToList() is
                { Count: > 0 } here
            )
            {
                return here;
            }

            return Bases(type)
                .Select(baseType => InHierarchy(baseType, name, arguments, seen))
                .FirstOrDefault(static found => found is not null);
        }

        /// <summary>
        /// The app's types that the type's declarations name as bases.
        /// </summary>
        private IEnumerable<TypeDeclarationSyntax> Bases(TypeDeclarationSyntax type) =>
            _typesByKey[TypeKey(type)]
                .SelectMany(static part => part.BaseList?.Types ?? default)
                .SelectMany(baseType => TypesNamed(baseType.Type));

        /// <summary>
        /// The app's types with the simple name that a type or an expression naming one ends with.
        /// </summary>
        private IEnumerable<TypeDeclarationSyntax> TypesNamed(SyntaxNode node) =>
            (
                node switch
                {
                    SimpleNameSyntax simple => simple.Identifier.ValueText,
                    QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
                    AliasQualifiedNameSyntax alias => alias.Name.Identifier.ValueText,
                    MemberAccessExpressionSyntax access => access.Name.Identifier.ValueText,
                    _ => null,
                }
            )
                is { } name
            && _typesByName.TryGetValue(name, out var types)
                ? types
                : [];

        private static bool DeclaresLocal(MethodDeclarationSyntax method, string name) =>
            method
                .DescendantNodes()
                .Any(node =>
                    node switch
                    {
                        ParameterSyntax parameter => parameter.Identifier.ValueText == name,
                        VariableDeclaratorSyntax variable => variable.Identifier.ValueText == name,
                        SingleVariableDesignationSyntax designation => designation.Identifier.ValueText == name,
                        ForEachStatementSyntax loop => loop.Identifier.ValueText == name,
                        _ => false,
                    }
                );

        /// <summary>
        /// Whether a method can take this many arguments.
        /// </summary>
        private static bool Fits(PipelineMethod method, int arguments)
        {
            var parameters = method.Method.ParameterList.Parameters;
            if (parameters.Any(static p => p.Modifiers.Any(SyntaxKind.ParamsKeyword)))
            {
                return arguments >= parameters.Count - 1;
            }

            return arguments >= parameters.Count(static p => p.Default is null) && arguments <= parameters.Count;
        }

        /// <summary>
        /// A type's name with its namespaces and containing types, which its partial declarations share.
        /// </summary>
        private static string TypeKey(TypeDeclarationSyntax type) =>
            string.Join(
                '.',
                type.AncestorsAndSelf()
                    .Reverse()
                    .Select(static node =>
                        node switch
                        {
                            BaseNamespaceDeclarationSyntax ns => ns.Name.ToString(),
                            TypeDeclarationSyntax declaration => declaration.Identifier.ValueText
                                + (declaration.TypeParameterList is { } list ? $"`{list.Parameters.Count}" : ""),
                            _ => null,
                        }
                    )
                    .OfType<string>()
            );

        private static void Add<T>(Dictionary<string, List<T>> index, string key, T value)
        {
            if (!index.TryGetValue(key, out var values))
            {
                values = [];
                index[key] = values;
            }

            values.Add(value);
        }
    }
}
