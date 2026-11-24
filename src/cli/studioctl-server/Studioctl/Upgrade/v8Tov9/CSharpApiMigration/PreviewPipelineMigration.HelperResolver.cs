using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PreviewPipelineMigration
{
    /// <summary>
    /// Finds the app's own methods that a call or method group reaches: through its symbol when the semantic model
    /// resolves it, and otherwise the way C# looks a method up by name. A bare or <c>this.</c> name looks in the
    /// caller's type and its bases, then for a bare name in its containing types and <c>using static</c> types;
    /// <c>base.</c> looks in the bases; a name through a type name looks in that type; and a call on the builder looks
    /// among extension methods. It finds the methods taking or returning the builder, and any function of the app
    /// that a composition passes as a step, local functions included.
    /// </summary>
    private sealed class HelperResolver
    {
        private readonly Dictionary<(SyntaxTree Tree, TextSpan Span), PipelineMethod> _byDeclaration = [];
        private readonly Dictionary<string, List<PipelineMethod>> _byType = new(StringComparer.Ordinal);
        private readonly List<PipelineMethod> _extensions = [];
        private readonly Dictionary<(SyntaxTree Tree, TextSpan Span), StepFunction> _functions = [];
        private readonly Dictionary<string, List<StepFunction>> _functionsByType = new(StringComparer.Ordinal);
        private readonly Dictionary<SyntaxTree, ScannedCSharpFile> _filesByTree = [];
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
                _filesByTree[file.Root.SyntaxTree] = file;
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
                        case MethodDeclarationSyntax method when method.Parent is TypeDeclarationSyntax type:
                            var function = new StepFunction(file, method);
                            _functions[(method.SyntaxTree, method.Span)] = function;
                            Add(_functionsByType, TypeKey(type), function);
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

        public IReadOnlyList<PipelineMethod> Resolve(InvocationExpressionSyntax invocation, PipelineMethod caller)
        {
            if (BySymbol(invocation, caller.Model) is { } declarations)
            {
                return
                [
                    .. declarations
                        .Select(reference => _byDeclaration.GetValueOrDefault((reference.SyntaxTree, reference.Span)))
                        .OfType<PipelineMethod>()
                        .Distinct(),
                ];
            }

            var arguments = invocation.ArgumentList.Arguments.Count;
            // The builder's own methods win over an extension method.
            if (
                invocation.Expression is MemberAccessExpressionSyntax { Expression: var receiver, Name: var name }
                && !_previewMethods.ContainsKey(name.Identifier.ValueText)
                && receiver is not ThisExpressionSyntax and not BaseExpressionSyntax
                && IsBuilderExpression(receiver, caller, this)
            )
            {
                return
                [
                    .. _extensions.Where(m =>
                        m.Method.Identifier.ValueText == name.Identifier.ValueText
                        && Fits(m.Method.ParameterList, arguments + 1)
                    ),
                ];
            }

            return ByName(
                invocation.Expression,
                caller.File,
                _byType,
                static method => method.Method.Identifier.ValueText,
                method => Fits(method.Method.ParameterList, arguments)
            );
        }

        /// <summary>
        /// The app's functions that a call's target or a method group names, among those whose parameters fit.
        /// </summary>
        public IReadOnlyList<StepFunction> ResolveFunction(
            ExpressionSyntax target,
            ScannedCSharpFile file,
            Func<ParameterListSyntax, bool> fits
        )
        {
            if (BySymbol(target, file.SemanticModel) is { } declarations)
            {
                return [.. declarations.Select(Function).OfType<StepFunction>().Distinct()];
            }

            if (target is SimpleNameSyntax { Identifier.ValueText: var localName })
            {
                var locals = target
                    .Ancestors()
                    .OfType<MemberDeclarationSyntax>()
                    .FirstOrDefault()
                    ?.DescendantNodes()
                    .OfType<LocalFunctionStatementSyntax>()
                    .Where(local => local.Identifier.ValueText == localName && fits(local.ParameterList))
                    .Select(local => Function(local.GetReference()))
                    .OfType<StepFunction>()
                    .ToList();
                if (locals is { Count: > 0 })
                {
                    return locals;
                }
            }

            return ByName(
                target,
                file,
                _functionsByType,
                static function => function.Name,
                function => fits(function.Parameters)
            );
        }

        private StepFunction? Function(SyntaxReference reference)
        {
            if (_functions.TryGetValue((reference.SyntaxTree, reference.Span), out var function))
            {
                return function;
            }

            if (
                reference.GetSyntax() is LocalFunctionStatementSyntax declaration
                && _filesByTree.TryGetValue(declaration.SyntaxTree, out var file)
            )
            {
                function = new StepFunction(file, declaration);
                _functions[(reference.SyntaxTree, reference.Span)] = function;
                return function;
            }

            return null;
        }

        /// <summary>
        /// The declarations of the methods the semantic model binds the expression to, or <c>null</c> when it has no
        /// model or binds it to none.
        /// </summary>
        private static IReadOnlyList<SyntaxReference>? BySymbol(ExpressionSyntax expression, SemanticModel? model)
        {
            if (model is null || model.SyntaxTree != expression.SyntaxTree)
            {
                return null;
            }

            var info = model.GetSymbolInfo(expression);
            IEnumerable<ISymbol> symbols = info.Symbol is { } symbol ? [symbol] : info.CandidateSymbols;
            var methods = symbols.OfType<IMethodSymbol>().ToList();
            if (methods.Count == 0)
            {
                return null;
            }

            return
            [
                .. methods.SelectMany(static method =>
                    (method.ReducedFrom ?? method).OriginalDefinition.DeclaringSyntaxReferences
                ),
            ];
        }

        private IReadOnlyList<T> ByName<T>(
            ExpressionSyntax target,
            ScannedCSharpFile file,
            Dictionary<string, List<T>> byType,
            Func<T, string> nameOf,
            Func<T, bool> fits
        )
        {
            var callerType = target.FirstAncestorOrSelf<TypeDeclarationSyntax>();
            List<T>? InHierarchyNamed(TypeDeclarationSyntax type, string name) =>
                InHierarchy(type, [], key => byType.GetValueOrDefault(key), m => nameOf(m) == name && fits(m));
            switch (target)
            {
                case SimpleNameSyntax name:
                    for (var type = callerType; type is not null; type = type.Parent as TypeDeclarationSyntax)
                    {
                        if (InHierarchyNamed(type, name.Identifier.ValueText) is { } found)
                        {
                            return found;
                        }
                    }

                    // The innermost namespace declaration's usings first, as C# looks.
                    return target
                            .Ancestors()
                            .OfType<BaseNamespaceDeclarationSyntax>()
                            .SelectMany(static ns => ns.Usings)
                            .Concat(file.Root.Usings)
                            .Where(static u => u.StaticKeyword != default)
                            .Concat(_globalStaticUsings)
                            .SelectMany(u => TypesNamed(u.NamespaceOrType))
                            .Select(type => InHierarchyNamed(type, name.Identifier.ValueText))
                            .FirstOrDefault(static found => found is not null)
                        ?? [];
                case MemberAccessExpressionSyntax { Expression: ThisExpressionSyntax, Name: var name }
                    when callerType is not null:
                    return InHierarchyNamed(callerType, name.Identifier.ValueText) ?? [];
                case MemberAccessExpressionSyntax { Expression: BaseExpressionSyntax, Name: var name }
                    when callerType is not null:
                    return Bases(callerType)
                            .Select(type => InHierarchyNamed(type, name.Identifier.ValueText))
                            .FirstOrDefault(static found => found is not null)
                        ?? [];
                case MemberAccessExpressionSyntax { Expression: var receiver, Name: var name }:
                    if (
                        receiver is IdentifierNameSyntax local
                        && target.FirstAncestorOrSelf<MemberDeclarationSyntax>() is { } member
                        && DeclaresLocal(member, local.Identifier.ValueText)
                    )
                    {
                        return [];
                    }

                    return TypesNamed(receiver)
                            .Select(type => InHierarchyNamed(type, name.Identifier.ValueText))
                            .FirstOrDefault(static found => found is not null)
                        ?? [];
                default:
                    return [];
            }
        }

        /// <summary>
        /// The members that match in the nearest of the type, across its partial declarations, and its bases.
        /// </summary>
        private List<T>? InHierarchy<T>(
            TypeDeclarationSyntax type,
            HashSet<string> seen,
            Func<string, List<T>?> members,
            Func<T, bool> matches
        )
        {
            var key = TypeKey(type);
            if (!seen.Add(key))
            {
                return null;
            }

            if (members(key)?.Where(matches).ToList() is { Count: > 0 } here)
            {
                return here;
            }

            return Bases(type)
                .Select(baseType => InHierarchy(baseType, seen, members, matches))
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

        private static bool DeclaresLocal(SyntaxNode member, string name) =>
            member
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
