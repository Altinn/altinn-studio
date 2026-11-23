using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Moves pipeline code written against an earlier v9 preview to the builder variants. The previews handed every
/// <c>Define</c> method one <c>PipelineBuilder</c>: a service task ended its pipeline with <c>Finally</c> or
/// <c>ConcludeOnReplies</c>, and <c>DefineStart</c>, <c>DefineEnd</c> and <c>DefineAbandon</c> returned
/// <c>pipeline.Build()</c>. Now <c>DefineExecute</c> takes <c>PipelineBuilder.ServiceTask</c>, where the step that ends
/// the task is a <c>Stage</c> or <c>HandleReplies</c> chosen by what its work returns, and the lifecycle methods take
/// <c>PipelineBuilder.Lifecycle</c> and return <c>void</c>.
/// </summary>
/// <remarks>
/// <p><c>Finally</c> and <c>ConcludeOnReplies</c> are common names, so a call is renamed only when its receiver is the
/// builder: by its type when the semantic model resolves it, and otherwise when it is a chain of <c>Stage</c> and
/// <c>HandleReplies</c> calls rooted at a parameter or local declared <c>PipelineBuilder</c>, at a <c>var</c> local
/// holding such a chain, or at a call to a method declared to return <c>PipelineBuilder</c>. A lifecycle method that
/// only returns <c>pipeline.Build()</c> keeps an empty body rather than being removed: it does what the interface
/// default does, and removing it would break an override of it or a call to it.</p>
/// <p>A helper method that takes or returns a <c>PipelineBuilder</c> gets the variant its callers in the
/// <c>Define</c> methods and its own calls show. When they show both, or neither, it is reported. So is a lifecycle
/// method whose returns are not a composed pipeline's <c>Build()</c>, and a <c>PipelineBuilder</c> declared anywhere
/// else, such as a field.</p>
/// <p>A port stub written by an earlier studioctl preview, <c>ProcessTaskPipeline DefineStart(PipelineBuilder)</c>
/// with an <c>#error</c> line and no statements, becomes the stub <see cref="ProcessTaskLifecycleMigration"/> writes
/// now. Runs before that migration, so that it then counts the rewritten <c>Define</c> methods as the task's own.</p>
/// </remarks>
internal sealed partial class PipelineBuilderVariantMigration
{
    private const string BuilderNamespace = "Altinn.App.Core.Features.Process";
    private const string BuilderName = "PipelineBuilder";
    private const string ServiceTaskVariant = "ServiceTask";
    private const string LifecycleVariant = "Lifecycle";
    private const string ServiceTaskPipelineName = "ServiceTaskPipeline";
    private const string ProcessTaskPipelineName = "ProcessTaskPipeline";
    private const string ExecuteName = "DefineExecute";

    private static readonly string[] _phases = ["Start", "End", "Abandon"];

    /// <summary>
    /// The calls that continue a chain on the previews' builder and return the builder.
    /// </summary>
    private static readonly HashSet<string> _chainingCalls = new(StringComparer.Ordinal) { "Stage", "HandleReplies" };

    /// <summary>
    /// The previews' service task endings, and what each is called now.
    /// </summary>
    private static readonly Dictionary<string, string> _endingRenames = new(StringComparer.Ordinal)
    {
        ["Finally"] = "Stage",
        ["ConcludeOnReplies"] = "HandleReplies",
    };

    private enum Role
    {
        Execute,
        Phase,
        Helper,
    }

    /// <summary>
    /// What becomes of a <c>return</c> in a lifecycle method that returned <c>pipeline.Build()</c>.
    /// </summary>
    private enum ReturnChange
    {
        /// <summary>
        /// The method's last statement returned the builder itself: removed.
        /// </summary>
        Remove,

        /// <summary>
        /// The method's last statement returned a composed chain: the chain stays as a statement.
        /// </summary>
        Statement,

        /// <summary>
        /// An early return of the builder itself: <c>return;</c>.
        /// </summary>
        ReturnVoid,

        /// <summary>
        /// An early return of a composed chain in a block: the chain, then <c>return;</c>.
        /// </summary>
        Expand,
    }

    /// <summary>
    /// A method that takes or returns the previews' builder, and what is known about it.
    /// </summary>
    private sealed class PipelineMethod(ScannedCSharpFile file, MethodDeclarationSyntax method, Role role)
    {
        public ScannedCSharpFile File { get; } = file;

        public MethodDeclarationSyntax Method { get; } = method;

        public Role Role { get; } = role;

        public SemanticModel? Model => File.SemanticModel;

        /// <summary>
        /// The names in the method that hold the builder.
        /// </summary>
        public HashSet<string> Builders { get; } = new(StringComparer.Ordinal);

        /// <summary>
        /// The variants the method composes, from what it is and what calls it.
        /// </summary>
        public HashSet<string> Variants { get; } = new(StringComparer.Ordinal);
    }

    private readonly CSharpSourceScanner _scanner;

    public PipelineBuilderVariantMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var messages = new List<UpgradeMessage>();
        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = _scanner.Files.ToArray();
        var appDeclaresBuilder = files
            .SelectMany(static file => file.Root.DescendantNodes().OfType<BaseTypeDeclarationSyntax>())
            .Any(static declaration => declaration.Identifier.ValueText == BuilderName);

        // Detect everything before rewriting anything: an update refreshes the semantic models.
        var methods = new List<PipelineMethod>();
        var reported = new HashSet<SyntaxNode>();
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var found = file
                .Root.DescendantNodes()
                .OfType<MethodDeclarationSyntax>()
                .Where(method => TakesOrReturnsBuilder(method, file.SemanticModel))
                .ToList();
            if (found.Count > 0 && file.SemanticModel is null && appDeclaresBuilder)
            {
                messages.Todo(
                    $"{file.RelativePath}: the app declares its own {BuilderName}, which cannot be told apart from "
                        + "the Altinn one without a compilation of the app. If this file composes Altinn pipelines, "
                        + $"give {ExecuteName} a {BuilderName}.{ServiceTaskVariant}, replacing Finally with Stage and "
                        + $"ConcludeOnReplies with HandleReplies, and make DefineStart, DefineEnd and DefineAbandon "
                        + $"void methods that take a {BuilderName}.{LifecycleVariant}, without Build()."
                );
                reported.UnionWith(found);
                continue;
            }

            methods.AddRange(found.Select(method => new PipelineMethod(file, method, RoleOf(method))));
        }

        var builderHelpers = methods
            .Where(static method => IsBuilder(method.Method.ReturnType, method.Model))
            .Select(static method => method.Method.Identifier.ValueText)
            .ToHashSet(StringComparer.Ordinal);
        foreach (var method in methods)
        {
            CollectBuilders(method, builderHelpers);
        }

        DecideVariants(methods, builderHelpers);

        var rewrites =
            new Dictionary<ScannedCSharpFile, Dictionary<MethodDeclarationSyntax, MemberDeclarationSyntax>>();
        foreach (var method in methods)
        {
            cancellationToken.ThrowIfCancellationRequested();
            reported.Add(method.Method);
            if (Rewrite(method, builderHelpers, messages) is { } rewritten)
            {
                if (!rewrites.TryGetValue(method.File, out var fileRewrites))
                {
                    fileRewrites = [];
                    rewrites[method.File] = fileRewrites;
                }

                fileRewrites[method.Method] = rewritten;
            }
        }

        foreach (var file in files.Where(file => file.SemanticModel is not null || !appDeclaresBuilder))
        {
            ReportStrayBuilders(file, reported, messages);
        }

        foreach (var (file, fileRewrites) in rewrites)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _scanner.Update(file, file.Root.ReplaceNodes(fileRewrites.Keys, (original, _) => fileRewrites[original]));
        }

        return new MigrationResult(messages);
    }

    private static Role RoleOf(MethodDeclarationSyntax method)
    {
        if (method.ParameterList.Parameters is not [{ Type: var parameterType }] || !IsBuilder(parameterType, null))
        {
            return Role.Helper;
        }

        var name = method.Identifier.ValueText;
        if (name == ExecuteName && SimpleName(method.ReturnType) == ServiceTaskPipelineName)
        {
            return Role.Execute;
        }

        return
            name.StartsWith("Define", StringComparison.Ordinal)
            && _phases.Contains(name["Define".Length..], StringComparer.Ordinal)
            && SimpleName(method.ReturnType) == ProcessTaskPipelineName
            ? Role.Phase
            : Role.Helper;
    }

    /// <summary>
    /// The names that hold the builder in the method: its parameters and locals declared <c>PipelineBuilder</c>, and
    /// <c>var</c> locals initialized with a chain on one.
    /// </summary>
    private static void CollectBuilders(PipelineMethod method, IReadOnlySet<string> builderHelpers)
    {
        foreach (var node in method.Method.DescendantNodes())
        {
            switch (node)
            {
                case ParameterSyntax parameter when IsBuilder(parameter.Type, method.Model):
                    method.Builders.Add(parameter.Identifier.ValueText);
                    break;
                case DeclarationExpressionSyntax
                {
                    Designation: SingleVariableDesignationSyntax designation,
                } declaration when IsBuilder(declaration.Type, method.Model):
                    method.Builders.Add(designation.Identifier.ValueText);
                    break;
                case VariableDeclarationSyntax variable:
                    var declared = IsBuilder(variable.Type, method.Model);
                    foreach (var declarator in variable.Variables)
                    {
                        if (
                            declared
                            || (
                                variable.Type.IsVar
                                && declarator.Initializer is { } initializer
                                && IsBuilderExpression(initializer.Value, method, builderHelpers)
                            )
                        )
                        {
                            method.Builders.Add(declarator.Identifier.ValueText);
                        }
                    }

                    break;
            }
        }
    }

    /// <summary>
    /// A <c>Define</c> method composes its own variant. A helper composes what its calls on the builder need, and what
    /// the <c>Define</c> methods that pass it their builder compose.
    /// </summary>
    private static void DecideVariants(List<PipelineMethod> methods, IReadOnlySet<string> builderHelpers)
    {
        var callers = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        foreach (var method in methods)
        {
            if (method.Role == Role.Helper)
            {
                continue;
            }

            var variant = method.Role == Role.Execute ? ServiceTaskVariant : LifecycleVariant;
            method.Variants.Add(variant);
            foreach (var invocation in method.Method.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (
                    CalledName(invocation.Expression) is { } called
                    && invocation.ArgumentList.Arguments.Any(argument =>
                        IsBuilderExpression(argument.Expression, method, builderHelpers)
                    )
                )
                {
                    if (!callers.TryGetValue(called, out var variants))
                    {
                        variants = new HashSet<string>(StringComparer.Ordinal);
                        callers[called] = variants;
                    }

                    variants.Add(variant);
                }
            }
        }

        foreach (var method in methods.Where(static method => method.Role == Role.Helper))
        {
            if (callers.TryGetValue(method.Method.Identifier.ValueText, out var variants))
            {
                method.Variants.UnionWith(variants);
            }

            foreach (var (name, invocation) in BuilderCalls(method, builderHelpers))
            {
                if (_endingRenames.ContainsKey(name) || name == "HandleReplies" || HasOutArgument(invocation))
                {
                    method.Variants.Add(ServiceTaskVariant);
                }
                else if (name == "Build")
                {
                    method.Variants.Add(LifecycleVariant);
                }
            }
        }
    }

    /// <summary>
    /// The method in its new shape, or <c>null</c> with a to-do when it cannot be decided.
    /// </summary>
    private static MemberDeclarationSyntax? Rewrite(
        PipelineMethod method,
        IReadOnlySet<string> builderHelpers,
        List<UpgradeMessage> messages
    )
    {
        var location = $"{Location(method.File, method.Method)}: {MemberName(method.Method)}";
        if (method.Variants.Count != 1)
        {
            messages.Todo(
                $"{location} takes or returns a {BuilderName}, and "
                    + (
                        method.Variants.Count == 0
                            ? "nothing shows whether it composes a service task or a lifecycle phase"
                            : "it composes both a service task and a lifecycle phase"
                    )
                    + $". Give it {BuilderName}.{ServiceTaskVariant} for {ExecuteName} or "
                    + $"{BuilderName}.{LifecycleVariant} for DefineStart, DefineEnd and DefineAbandon, one copy for "
                    + "each when both use it, and replace Finally with Stage and ConcludeOnReplies with HandleReplies "
                    + "in a service task's."
            );
            return null;
        }

        var variant = method.Variants.Single();
        var phase = method.Role == Role.Phase ? method.Method.Identifier.ValueText["Define".Length..] : null;
        if (phase is not null && method.Method.Body is { Statements.Count: 0 } stubBody)
        {
            return PortStub(method, phase, stubBody, location, messages);
        }

        var rewriter = new MethodRewriter(variant, method.Role == Role.Phase);
        foreach (var node in method.Method.DescendantNodesAndSelf())
        {
            if (DeclaredType(node) is { } type && IsBuilder(type, method.Model))
            {
                rewriter.Retype.Add(type);
            }
        }

        var unsupported = new List<string>();
        var builds = new List<InvocationExpressionSyntax>();
        foreach (var (name, invocation) in BuilderCalls(method, builderHelpers))
        {
            if (variant == ServiceTaskVariant)
            {
                if (_endingRenames.TryGetValue(name, out var renamed))
                {
                    rewriter.Renames[invocation] = renamed;
                }
                else if (name == "Build")
                {
                    unsupported.Add($"Build() at line {method.File.GetLine(invocation)}");
                }
            }
            else if (name == "Build")
            {
                builds.Add(invocation);
            }
            else if (name != "Stage" || HasOutArgument(invocation))
            {
                unsupported.Add($"{name} at line {method.File.GetLine(invocation)}");
            }
        }

        if (variant == LifecycleVariant)
        {
            if (
                method.Role == Role.Helper
                && (builds.Count > 0 || SimpleName(method.Method.ReturnType) == ProcessTaskPipelineName)
            )
            {
                unsupported.Add("Build(), which its callers return");
            }
            else if (method.Role == Role.Phase)
            {
                PlanReturns(method, builderHelpers, rewriter, builds, unsupported);
            }
        }

        if (unsupported.Count > 0)
        {
            messages.Todo(
                $"{location} uses {string.Join(", ", unsupported)}, which a {BuilderName}.{variant} does not have "
                    + "or the upgrade cannot rewrite, so it was left as it is. "
                    + (
                        variant == LifecycleVariant
                            ? $"Make it take a {BuilderName}.{LifecycleVariant} and compose its stages with Stage, "
                                + "returning nothing, as in public void DefineEnd(PipelineBuilder.Lifecycle pipeline) "
                                + "=> pipeline.Stage(First).Stage(Second);"
                            : $"Make it take a {BuilderName}.{ServiceTaskVariant}."
                    )
            );
            return null;
        }

        var rewrittenMethod = MethodRewriter.Kept(rewriter.Visit(method.Method), method.Method);
        if (rewriter.EmptyBody)
        {
            rewrittenMethod = WithEmptyBody(rewrittenMethod);
        }

        messages.Ok(
            method.Role switch
            {
                Role.Execute => $"{location} takes a {BuilderName}.{ServiceTaskVariant}"
                    + (rewriter.Renames.Count > 0 ? ", ending with Stage or HandleReplies." : "."),
                Role.Phase => $"{location} takes a {BuilderName}.{LifecycleVariant} and returns nothing.",
                _ => $"{location} takes a {BuilderName}.{variant}, as the pipelines it is part of.",
            }
        );
        return rewrittenMethod;
    }

    /// <summary>
    /// Plans every <c>return</c> of a lifecycle method, which returned <c>pipeline.Build()</c> and now returns
    /// nothing. A return that is not a chain on the builder ending with <c>Build()</c>, or a <c>Build()</c> anywhere
    /// else, cannot be rewritten.
    /// </summary>
    private static void PlanReturns(
        PipelineMethod method,
        IReadOnlySet<string> builderHelpers,
        MethodRewriter rewriter,
        List<InvocationExpressionSyntax> builds,
        List<string> unsupported
    )
    {
        var handled = new HashSet<InvocationExpressionSyntax>();
        if (method.Method.ExpressionBody is { Expression: var arrow })
        {
            if (BuiltChain(arrow, method, builderHelpers) is not { } chain)
            {
                unsupported.Add("an expression body that is not a composed pipeline's Build()");
                return;
            }

            handled.Add((InvocationExpressionSyntax)arrow);
            rewriter.EmptyBody = Unwrap(chain) is not InvocationExpressionSyntax;
        }

        var returns = method
            .Method.DescendantNodes()
            .OfType<ReturnStatementSyntax>()
            .Where(statement => OwningFunction(statement) == method.Method);
        foreach (var statement in returns)
        {
            if (
                statement.Expression is not { } returned
                || BuiltChain(returned, method, builderHelpers) is not { } chain
            )
            {
                unsupported.Add(
                    $"a return at line {method.File.GetLine(statement)} that is not a composed pipeline's Build()"
                );
                continue;
            }

            handled.Add((InvocationExpressionSyntax)returned);
            var composes = Unwrap(chain) is InvocationExpressionSyntax;
            var isLast =
                statement.Parent is BlockSyntax block
                && block == method.Method.Body
                && block
                    .Statements.SkipWhile(other => other != statement)
                    .Skip(1)
                    .All(static other => other is LocalFunctionStatementSyntax);
            ReturnChange? change = (isLast, composes, statement.Parent) switch
            {
                (true, false, _) => ReturnChange.Remove,
                (true, true, _) => ReturnChange.Statement,
                (false, false, _) => ReturnChange.ReturnVoid,
                (false, true, BlockSyntax) => ReturnChange.Expand,
                _ => null,
            };
            if (change is not { } planned)
            {
                unsupported.Add($"an early return at line {method.File.GetLine(statement)} outside a block");
                continue;
            }

            rewriter.Returns[statement] = planned;
        }

        foreach (var build in builds.Where(build => !handled.Contains(build)))
        {
            unsupported.Add($"Build() at line {method.File.GetLine(build)}");
        }
    }

    /// <summary>
    /// The chain <paramref name="expression"/> builds, when it is <c>chain.Build()</c> on the builder.
    /// </summary>
    private static ExpressionSyntax? BuiltChain(
        ExpressionSyntax expression,
        PipelineMethod method,
        IReadOnlySet<string> builderHelpers
    ) =>
        expression
            is InvocationExpressionSyntax
            {
                Expression: MemberAccessExpressionSyntax { Name.Identifier.ValueText: "Build", Expression: var chain },
                ArgumentList.Arguments.Count: 0,
            }
        && IsBuilderExpression(chain, method, builderHelpers)
            ? chain
            : null;

    /// <summary>
    /// An earlier studioctl preview's port stub, as the stub <see cref="ProcessTaskLifecycleMigration"/> writes now.
    /// A <c>Define</c> method with no statements that is not one never compiled, so it is reported.
    /// </summary>
    private static MemberDeclarationSyntax? PortStub(
        PipelineMethod method,
        string phase,
        BlockSyntax body,
        string location,
        List<UpgradeMessage> messages
    )
    {
        if (StubCallName().Match(body.ToFullString()) is not { Success: true } match)
        {
            messages.Todo(
                $"{location} has no statements, so it returns no pipeline. Make it public void "
                    + $"Define{phase}({BuilderName}.{LifecycleVariant} pipeline) and compose its stages on pipeline."
            );
            return null;
        }

        var callName = match.Groups["call"].Value;
        messages.Ok(
            $"{location} was a port stub from an earlier upgrade. It takes a {BuilderName}.{LifecycleVariant} now, "
                + $"and still stops the build until {callName} is ported to stages."
        );
        return ProcessTaskLifecycleMigration.Definition(phase, callName, method.Method).WithTriviaFrom(method.Method);
    }

    /// <summary>
    /// The calls in the method whose receiver is the builder.
    /// </summary>
    private static IEnumerable<(string Name, InvocationExpressionSyntax Invocation)> BuilderCalls(
        PipelineMethod method,
        IReadOnlySet<string> builderHelpers
    )
    {
        foreach (var invocation in method.Method.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (
                invocation.Expression is MemberAccessExpressionSyntax { Expression: var receiver, Name: var name }
                && IsBuilderExpression(receiver, method, builderHelpers)
            )
            {
                yield return (name.Identifier.ValueText, invocation);
            }
        }
    }

    /// <summary>
    /// Whether the expression is the previews' builder: by its type when the semantic model resolves it, and otherwise
    /// a name that holds the builder, a call to a method declared to return one, or a <c>Stage</c> or
    /// <c>HandleReplies</c> on one of those.
    /// </summary>
    private static bool IsBuilderExpression(
        ExpressionSyntax expression,
        PipelineMethod method,
        IReadOnlySet<string> builderHelpers
    )
    {
        if (
            method.Model is { } model
            && model.SyntaxTree == expression.SyntaxTree
            && model.GetTypeInfo(expression).Type is { TypeKind: not TypeKind.Error } type
        )
        {
            return IsBuilderSymbol(type);
        }

        return Unwrap(expression) switch
        {
            IdentifierNameSyntax identifier => method.Builders.Contains(identifier.Identifier.ValueText),
            InvocationExpressionSyntax
            {
                Expression: MemberAccessExpressionSyntax { Name: var name, Expression: var receiver },
            } when _chainingCalls.Contains(name.Identifier.ValueText) => IsBuilderExpression(
                receiver,
                method,
                builderHelpers
            ),
            InvocationExpressionSyntax { Expression: IdentifierNameSyntax called } => builderHelpers.Contains(
                called.Identifier.ValueText
            ),
            InvocationExpressionSyntax
            {
                Expression: MemberAccessExpressionSyntax { Expression: ThisExpressionSyntax, Name: var called },
            } => builderHelpers.Contains(called.Identifier.ValueText),
            _ => false,
        };
    }

    private static bool TakesOrReturnsBuilder(MethodDeclarationSyntax method, SemanticModel? model) =>
        IsBuilder(method.ReturnType, model)
        || method.ParameterList.Parameters.Any(parameter => IsBuilder(parameter.Type, model));

    /// <summary>
    /// Whether a written type is the previews' builder: by the semantic model when it resolves the type, otherwise
    /// <c>PipelineBuilder</c>, bare or qualified with its namespace. <c>PipelineBuilder.ServiceTask</c> and
    /// <c>PipelineBuilder.Lifecycle</c> are not, so a migrated method is left alone.
    /// </summary>
    private static bool IsBuilder(TypeSyntax? type, SemanticModel? model)
    {
        // A var local gets its variant from what it holds.
        if (type is null || type.IsVar)
        {
            return false;
        }

        if (
            model is not null
            && model.SyntaxTree == type.SyntaxTree
            && model.GetTypeInfo(type).Type is { TypeKind: not TypeKind.Error } resolved
        )
        {
            return IsBuilderSymbol(resolved);
        }

        return type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText == BuilderName,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText == BuilderName
                && qualified.Left.ToString().Replace("global::", "", StringComparison.Ordinal) == BuilderNamespace,
            NullableTypeSyntax nullable => IsBuilder(nullable.ElementType, model),
            _ => false,
        };
    }

    /// <summary>
    /// The previews' builder: the Altinn <c>PipelineBuilder</c> that is not the variants' abstract base.
    /// </summary>
    private static bool IsBuilderSymbol(ITypeSymbol type) =>
        type is INamedTypeSymbol { Name: BuilderName, ContainingType: null, IsAbstract: false } named
        && named.ContainingNamespace.ToDisplayString() == BuilderNamespace
        && CSharpSemanticQueries.IsAltinnAppSymbol(named);

    /// <summary>
    /// The type a declaration in a method writes: a return type, parameter, local or <c>out</c> variable.
    /// </summary>
    private static TypeSyntax? DeclaredType(SyntaxNode node) =>
        node switch
        {
            MethodDeclarationSyntax method => method.ReturnType,
            LocalFunctionStatementSyntax function => function.ReturnType,
            ParameterSyntax parameter => parameter.Type,
            VariableDeclarationSyntax variable => variable.Type,
            DeclarationExpressionSyntax declaration => declaration.Type,
            PropertyDeclarationSyntax property => property.Type,
            _ => null,
        } switch
        {
            NullableTypeSyntax nullable => nullable.ElementType,
            var type => type,
        };

    /// <summary>
    /// Reports a <c>PipelineBuilder</c> declared outside the methods above, such as a field, which no variant can be
    /// chosen for.
    /// </summary>
    private static void ReportStrayBuilders(
        ScannedCSharpFile file,
        HashSet<SyntaxNode> reported,
        List<UpgradeMessage> messages
    )
    {
        var lines = new SortedSet<int>();
        foreach (
            var node in file
                .Root.DescendantNodes(node => !reported.Contains(node))
                .Where(node => !reported.Contains(node))
        )
        {
            if (DeclaredType(node) is { } type && IsBuilder(type, file.SemanticModel))
            {
                lines.Add(file.GetLine(type));
            }
        }

        foreach (var line in lines)
        {
            messages.Todo(
                $"{file.RelativePath}:{line}: this {BuilderName} is not a parameter or local of a method that composes "
                    + $"a pipeline, so it cannot be given a variant. Use {BuilderName}.{ServiceTaskVariant} for a "
                    + $"service task's or {BuilderName}.{LifecycleVariant} for DefineStart, DefineEnd and "
                    + "DefineAbandon."
            );
        }
    }

    private static MethodDeclarationSyntax WithEmptyBody(MethodDeclarationSyntax method)
    {
        var semicolon = method.SemicolonToken;
        return method
            .WithParameterList(
                method.ParameterList.WithCloseParenToken(method.ParameterList.CloseParenToken.WithTrailingTrivia())
            )
            .WithExpressionBody(null)
            .WithSemicolonToken(default)
            .WithBody(
                SyntaxFactory.Block(
                    SyntaxFactory
                        .Token(SyntaxKind.OpenBraceToken)
                        .WithLeadingTrivia(SyntaxFactory.Space)
                        .WithTrailingTrivia(SyntaxFactory.Space),
                    default,
                    SyntaxFactory.Token(SyntaxKind.CloseBraceToken).WithTrailingTrivia(semicolon.TrailingTrivia)
                )
            );
    }

    private static bool HasOutArgument(InvocationExpressionSyntax invocation) =>
        invocation.ArgumentList.Arguments.Any(static argument => argument.RefKindKeyword.IsKind(SyntaxKind.OutKeyword));

    /// <summary>
    /// The method, local function or lambda a statement returns from.
    /// </summary>
    private static SyntaxNode? OwningFunction(SyntaxNode node) =>
        node.Ancestors()
            .FirstOrDefault(static ancestor =>
                ancestor is MethodDeclarationSyntax or LocalFunctionStatementSyntax or AnonymousFunctionExpressionSyntax
            );

    private static ExpressionSyntax Unwrap(ExpressionSyntax expression) =>
        expression switch
        {
            ParenthesizedExpressionSyntax parenthesized => Unwrap(parenthesized.Expression),
            PostfixUnaryExpressionSyntax postfix when postfix.IsKind(SyntaxKind.SuppressNullableWarningExpression) =>
                Unwrap(postfix.Operand),
            _ => expression,
        };

    /// <summary>
    /// The simple name an invocation calls.
    /// </summary>
    private static string? CalledName(ExpressionSyntax expression) =>
        expression switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            MemberAccessExpressionSyntax access => access.Name.Identifier.ValueText,
            _ => null,
        };

    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            _ => null,
        };

    private static string Location(ScannedCSharpFile file, SyntaxNode node) =>
        $"{file.RelativePath}:{file.GetLine(node)}";

    private static string MemberName(MethodDeclarationSyntax method) =>
        method.Parent is TypeDeclarationSyntax type
            ? $"{type.Identifier.Text}.{method.Identifier.Text}"
            : method.Identifier.Text;

    /// <summary>
    /// The v8 method an earlier preview's port stub names, from its <c>#error</c> line or, once that is removed, its
    /// comment.
    /// </summary>
    [GeneratedRegex(
        @"(?:#error Port (?<call>\w+) to stages in Define|v9 no longer calls (?<call>\w+)\(string taskId)",
        RegexOptions.CultureInvariant
    )]
    private static partial Regex StubCallName();

    /// <summary>
    /// Applies the planned changes to one method.
    /// </summary>
    private sealed class MethodRewriter(string variant, bool returnsVoid) : CSharpSyntaxRewriter
    {
        public HashSet<TypeSyntax> Retype { get; } = [];

        public Dictionary<InvocationExpressionSyntax, string> Renames { get; } = [];

        public Dictionary<ReturnStatementSyntax, ReturnChange> Returns { get; } = [];

        /// <summary>
        /// Whether the expression body only returned <c>pipeline.Build()</c>, and becomes an empty body.
        /// </summary>
        public bool EmptyBody { get; set; }

        public override SyntaxNode? Visit(SyntaxNode? node)
        {
            switch (node)
            {
                case MethodDeclarationSyntax method when returnsVoid:
                    var visited = Kept(base.Visit(method), method)
                        .WithReturnType(
                            SyntaxFactory
                                .PredefinedType(SyntaxFactory.Token(SyntaxKind.VoidKeyword))
                                .WithTriviaFrom(method.ReturnType)
                        );
                    return
                        method.ExpressionBody is { } arrow && visited.ExpressionBody is { } visitedArrow && !EmptyBody
                        ? visited.WithExpressionBody(
                            visitedArrow.WithExpression(
                                ChainOf(arrow.Expression).WithLeadingTrivia(arrow.Expression.GetLeadingTrivia())
                            )
                        )
                        : visited;
                case TypeSyntax type when Retype.Contains(type):
                    return SyntaxFactory
                        .QualifiedName((NameSyntax)type.WithoutTrivia(), SyntaxFactory.IdentifierName(variant))
                        .WithTriviaFrom(type);
                case InvocationExpressionSyntax invocation when Renames.TryGetValue(invocation, out var renamed):
                    var call = Kept(base.Visit(invocation), invocation);
                    var access = (MemberAccessExpressionSyntax)call.Expression;
                    return call.WithExpression(
                        access.WithName(SyntaxFactory.IdentifierName(renamed).WithTriviaFrom(access.Name))
                    );
                case ReturnStatementSyntax statement
                    when Returns.TryGetValue(statement, out var change) && change == ReturnChange.ReturnVoid:
                    return statement
                        .WithExpression(null)
                        .WithReturnKeyword(statement.ReturnKeyword.WithTrailingTrivia());
                default:
                    return base.Visit(node);
            }
        }

        public override SyntaxNode? VisitBlock(BlockSyntax node)
        {
            if (!node.Statements.Any(statement => statement is ReturnStatementSyntax r && Returns.ContainsKey(r)))
            {
                return base.VisitBlock(node);
            }

            var statements = new List<StatementSyntax>();
            var closeBrace = node.CloseBraceToken;
            foreach (var statement in node.Statements)
            {
                if (statement is not ReturnStatementSyntax returned || !Returns.TryGetValue(returned, out var change))
                {
                    statements.Add(Kept(Visit(statement), statement));
                    continue;
                }

                var leading = returned.GetLeadingTrivia();
                switch (change)
                {
                    case ReturnChange.Remove:
                        // A comment above the removed return stays, above the closing brace.
                        if (
                            leading.Any(static trivia =>
                                trivia.IsKind(SyntaxKind.SingleLineCommentTrivia)
                                || trivia.IsKind(SyntaxKind.MultiLineCommentTrivia)
                            )
                        )
                        {
                            var kept = leading.Count;
                            while (kept > 0 && leading[kept - 1].IsKind(SyntaxKind.WhitespaceTrivia))
                            {
                                kept--;
                            }

                            closeBrace = closeBrace.WithLeadingTrivia(
                                leading.Take(kept).Concat(closeBrace.LeadingTrivia)
                            );
                        }

                        break;
                    case ReturnChange.Statement:
                        statements.Add(Statement(returned));
                        break;
                    case ReturnChange.Expand:
                        statements.Add(Statement(returned));
                        statements.Add(
                            SyntaxFactory
                                .ReturnStatement()
                                .WithReturnKeyword(SyntaxFactory.Token(SyntaxKind.ReturnKeyword))
                                .WithLeadingTrivia(
                                    leading
                                        .Where(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia))
                                        .TakeLast(1)
                                )
                                .WithTrailingTrivia(returned.GetTrailingTrivia())
                        );
                        break;
                    default:
                        statements.Add(Kept(Visit(statement), statement));
                        break;
                }
            }

            return node.WithStatements(SyntaxFactory.List(statements)).WithCloseBraceToken(closeBrace);
        }

        /// <summary>
        /// The chain a <c>return chain.Build();</c> composed, as a statement in its place.
        /// </summary>
        private ExpressionStatementSyntax Statement(ReturnStatementSyntax returned) =>
            SyntaxFactory
                .ExpressionStatement(
                    ChainOf(
                        returned.Expression ?? throw new InvalidOperationException("A planned return lost its value.")
                    ),
                    returned.SemicolonToken
                )
                .WithLeadingTrivia(returned.GetLeadingTrivia());

        /// <summary>
        /// <c>chain</c> from <c>chain.Build()</c>, with the changes planned inside it, without the trivia around it
        /// and the parentheses, which a statement cannot start with.
        /// </summary>
        private ExpressionSyntax ChainOf(ExpressionSyntax built) =>
            Unwrap(Kept(Visit(BuiltFrom(built)), BuiltFrom(built))).WithoutTrivia();

        /// <summary>
        /// The rewritten form of <paramref name="original"/>, which keeps its kind.
        /// </summary>
        public static T Kept<T>(SyntaxNode? rewritten, T original)
            where T : SyntaxNode =>
            rewritten as T
            ?? throw new InvalidOperationException($"Rewriting changed the kind of a {original.Kind()}.");

        private static ExpressionSyntax BuiltFrom(ExpressionSyntax built) =>
            ((MemberAccessExpressionSyntax)((InvocationExpressionSyntax)built).Expression).Expression;
    }
}
