using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Moves pipeline code written against an earlier v9 preview to the current API. The previews handed every
/// <c>Define</c> method one <c>PipelineBuilder</c>: a service task ended its pipeline with <c>Finally</c> or
/// <c>ConcludeOnReplies</c> and answered each mailbox-opening <c>Stage</c> through a <c>MailboxHandle</c>, and
/// <c>DefineStart</c>, <c>DefineEnd</c> and <c>DefineAbandon</c> returned <c>pipeline.Build()</c>. Now
/// <c>DefineExecute</c> takes <c>PipelineBuilder.ServiceTask</c>, where a send and its reply handler are one
/// <c>ExternalStage</c>, the lifecycle methods take <c>PipelineBuilder.Lifecycle</c>, and all of them return nothing.
/// </summary>
/// <remarks>
/// <p><c>Finally</c> and <c>Build</c> are common names, so a call is rewritten only when its receiver is the builder:
/// by its type when the semantic model resolves it, and otherwise when it is a chain of <c>Stage</c> and
/// <c>HandleReplies</c> calls rooted at a parameter or local declared <c>PipelineBuilder</c>, at a <c>var</c> local
/// holding such a chain, or at a call that reaches a method of the app declared to return <c>PipelineBuilder</c>, as
/// <see cref="HelperResolver"/> finds it. A method the rules cannot place whole is reported and left as it is, with
/// every reason, as <see cref="Unplaced"/> and <see cref="PlanExternalStages"/> find them.</p>
/// <p>The methods a composition passes as its steps get the result types of the current API, as
/// <see cref="StepTies"/> decides, and the renames that mean the same wherever they stand are made in every file, as
/// <see cref="RenameRewriter"/> lists them. Whatever still names the previews' API afterwards is reported with its
/// file and line.</p>
/// <p>A port stub written by an earlier studioctl preview, <c>ProcessTaskPipeline DefineStart(PipelineBuilder)</c>
/// with an <c>#error</c> line and no statements, becomes the stub <see cref="ProcessTaskLifecycleMigration"/> writes
/// now. Runs before that migration, so that it then counts the rewritten <c>Define</c> methods as the task's own.</p>
/// </remarks>
internal sealed partial class PreviewPipelineMigration
{
    private static readonly string[] _phases = ["Start", "End", "Abandon"];

    /// <summary>
    /// The previews' builder methods that return the builder, so that a chain continues after them.
    /// </summary>
    private static readonly HashSet<string> _chainingCalls = new(StringComparer.Ordinal)
    {
        PipelineApi.Stage,
        PreviewApi.HandleReplies,
    };

    /// <summary>
    /// Marks a method that is reported and left as it is, so that no later pass changes it or reports it again.
    /// </summary>
    private static readonly SyntaxAnnotation _leftAsItIs = new(nameof(PreviewPipelineMigration));

    /// <summary>
    /// Marks a call whose result is held as the type the previews' member returned, as <see cref="MarkHeldResults"/>
    /// finds it.
    /// </summary>
    private static readonly SyntaxAnnotation _heldAsReturned = new(nameof(MarkHeldResults));

    private enum Role
    {
        Execute,
        Phase,
        Helper,
    }

    /// <summary>
    /// What becomes of a <c>return</c> in a <c>Define</c> method that returned a pipeline and now returns nothing.
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

    public PreviewPipelineMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var messages = new List<UpgradeMessage>();
        var names = new TypeNames(_scanner.Files);
        MarkHeldResults(names);

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = _scanner.Files.ToArray();

        // Without a compilation, an app's own PipelineBuilder reads like the Altinn one.
        bool TellsBuildersApart(ScannedCSharpFile file) =>
            file.SemanticModel is not null || !names.AppDeclares(PipelineApi.Builder);

        // Detect everything before rewriting anything: an update refreshes the semantic models.
        var methods = new List<PipelineMethod>();
        var reported = new HashSet<SyntaxNode>();
        var leftAsItIs = new List<(ScannedCSharpFile File, SyntaxNode Node)>();
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var found = file
                .Root.DescendantNodes()
                .OfType<MethodDeclarationSyntax>()
                .Where(method => TakesOrReturnsBuilder(method, file.SemanticModel))
                .ToList();
            if (found.Count > 0 && !TellsBuildersApart(file))
            {
                messages.Todo(
                    $"{file.RelativePath}: the app declares its own {PipelineApi.Builder}, which cannot be told apart "
                        + "from the Altinn one without a compilation of the app. If this file composes Altinn pipelines, "
                        + $"make {PipelineApi.DefineExecute} a void method that takes a {PipelineApi.ServiceTaskBuilder} "
                        + "and composes Stage and ExternalStage, and DefineStart, DefineEnd and DefineAbandon void "
                        + $"methods that take a {PipelineApi.LifecycleBuilder}, without Build()."
                );
                reported.UnionWith(found);
                leftAsItIs.AddRange(found.Select(method => (file, (SyntaxNode)method)));
                continue;
            }

            methods.AddRange(found.Select(method => new PipelineMethod(file, method, RoleOf(method))));
        }

        var helpers = new HelperResolver(files, methods);
        foreach (var method in methods)
        {
            CollectBuilders(method, helpers);
        }

        DecideVariants(methods, helpers);

        var steps = new StepTies(files, helpers, names);
        var rewriters = new Dictionary<PipelineMethod, MethodRewriter>();
        foreach (var method in methods)
        {
            cancellationToken.ThrowIfCancellationRequested();
            reported.Add(method.Method);
            if (Plan(method, helpers, steps, messages) is { } rewriter)
            {
                rewriters[method] = rewriter;
            }
            else
            {
                leftAsItIs.Add((method.File, method.Method));
            }
        }

        var stepRewrites = steps.Decide(messages);

        foreach (var file in files.Where(TellsBuildersApart))
        {
            ReportStrayBuilders(file, reported, messages);
        }

        var replacements = new Dictionary<ScannedCSharpFile, Dictionary<SyntaxNode, SyntaxNode>>();
        void Replace(ScannedCSharpFile file, SyntaxNode original, SyntaxNode replacement)
        {
            if (!replacements.TryGetValue(file, out var fileReplacements))
            {
                fileReplacements = [];
                replacements[file] = fileReplacements;
            }

            fileReplacements[original] = replacement;
        }

        foreach (var (method, rewriter) in rewriters)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Replace(method.File, method.Method, rewriter.Rewrite(method.Method));
        }

        foreach (var (file, node, rewritten) in stepRewrites)
        {
            Replace(file, node, rewritten);
        }

        foreach (var (file, node) in leftAsItIs)
        {
            Replace(file, node, node.WithAdditionalAnnotations(_leftAsItIs));
        }

        messages = ResolveLines(messages, replacements);
        foreach (var (file, fileReplacements) in replacements)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _scanner.Update(
                file,
                file.Root.ReplaceNodes(fileReplacements.Keys, (original, _) => fileReplacements[original])
            );
        }

        // After the methods, so that what they leave is found in its new tree. A snapshot again, of the files those
        // rewrites replaced.
        foreach (var file in _scanner.Files.Where(TellsBuildersApart).ToArray())
        {
            cancellationToken.ThrowIfCancellationRequested();
            RewriteDocReferences(file, names, messages);
        }

        foreach (var file in _scanner.Files.ToArray())
        {
            cancellationToken.ThrowIfCancellationRequested();
            RenameEverywhere(file, names, messages);
        }

        foreach (var file in _scanner.Files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ReportLeftovers(file, names, messages);
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
        if (name == PipelineApi.DefineExecute && SimpleName(method.ReturnType) == PreviewApi.ServiceTaskPipeline)
        {
            return Role.Execute;
        }

        return
            name.StartsWith("Define", StringComparison.Ordinal)
            && _phases.Contains(name["Define".Length..], StringComparer.Ordinal)
            && SimpleName(method.ReturnType) == PreviewApi.ProcessTaskPipeline
            ? Role.Phase
            : Role.Helper;
    }

    /// <summary>
    /// The names that hold the builder in the method: its parameters and locals declared <c>PipelineBuilder</c>, and
    /// <c>var</c> locals initialized with a chain on one.
    /// </summary>
    private static void CollectBuilders(PipelineMethod method, HelperResolver helpers)
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
                                && IsBuilderExpression(initializer.Value, method, helpers)
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
    private static void DecideVariants(List<PipelineMethod> methods, HelperResolver helpers)
    {
        foreach (var method in methods.Where(static method => method.Role != Role.Helper))
        {
            var variant = method.Role == Role.Execute ? PipelineApi.ServiceTaskVariant : PipelineApi.LifecycleVariant;
            method.Variants.Add(variant);
            foreach (var invocation in method.Method.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                var passesBuilder =
                    invocation.ArgumentList.Arguments.Any(argument =>
                        IsBuilderExpression(argument.Expression, method, helpers)
                    )
                    || (
                        invocation.Expression is MemberAccessExpressionSyntax { Expression: var receiver }
                        && IsBuilderExpression(receiver, method, helpers)
                    );
                if (!passesBuilder)
                {
                    continue;
                }

                foreach (var helper in helpers.Resolve(invocation, method).Where(static h => h.Role == Role.Helper))
                {
                    helper.Variants.Add(variant);
                }
            }
        }

        foreach (var method in methods.Where(static method => method.Role == Role.Helper))
        {
            foreach (var (name, invocation) in BuilderCalls(method, helpers))
            {
                if (
                    name is PreviewApi.Finally or PreviewApi.HandleReplies or PreviewApi.ConcludeOnReplies
                    || HasOutArgument(invocation)
                )
                {
                    method.Variants.Add(PipelineApi.ServiceTaskVariant);
                }
                else if (name == PreviewApi.Build)
                {
                    method.Variants.Add(PipelineApi.LifecycleVariant);
                }
            }
        }
    }

    /// <summary>
    /// The rewriter that gives the method its new shape, or <c>null</c> with a to-do when it cannot be decided.
    /// </summary>
    private static MethodRewriter? Plan(
        PipelineMethod method,
        HelperResolver helpers,
        StepTies steps,
        List<UpgradeMessage> messages
    )
    {
        var location = $"{Location(method.File, method.Method)}: {MemberName(method.Method)}";
        if (method.Variants.Count != 1)
        {
            messages.Todo(
                $"{location} takes or returns a {PipelineApi.Builder}, and "
                    + (
                        method.Variants.Count == 0
                            ? "nothing shows whether it composes a service task or a lifecycle phase"
                            : "it composes both a service task and a lifecycle phase"
                    )
                    + $". Give it {PipelineApi.ServiceTaskBuilder} for {PipelineApi.DefineExecute} or "
                    + $"{PipelineApi.LifecycleBuilder} for DefineStart, DefineEnd and DefineAbandon, one copy for "
                    + "each when both use it, and compose a service task's with Stage and ExternalStage."
            );
            return null;
        }

        var variant = method.Variants.Single();
        var phase = method.Role == Role.Phase ? method.Method.Identifier.ValueText["Define".Length..] : null;
        if (phase is not null && method.Method.Body is { Statements.Count: 0 } stubBody)
        {
            return PortStub(method, phase, stubBody, location, messages);
        }

        var rewriter = new MethodRewriter(
            variant,
            returnsVoid: method.Role != Role.Helper,
            returnsChain: method.Role == Role.Execute
        );
        foreach (var node in method.Method.DescendantNodesAndSelf())
        {
            if (DeclaredType(node) is { } type && IsBuilder(type, method.Model))
            {
                rewriter.Retype.Add(type);
            }
        }

        var unsupported = new List<string>();
        var stepArguments = new List<(ArgumentSyntax Argument, StepRole Role)>();
        if (variant == PipelineApi.ServiceTaskVariant)
        {
            PlanServiceTask(method, helpers, rewriter, stepArguments, unsupported);
        }
        else
        {
            PlanLifecycle(method, helpers, rewriter, unsupported);
        }

        unsupported.AddRange(Unplaced(method, helpers, rewriter));
        unsupported.AddRange(StepTies.Check(method, stepArguments));
        if (unsupported.Count > 0)
        {
            messages.Todo(
                $"{location} has {string.Join("; ", unsupported)}, so it was left as it is. "
                    + (
                        variant == PipelineApi.LifecycleVariant
                            ? $"Make it take a {PipelineApi.LifecycleBuilder} and compose its stages with Stage, "
                                + "returning nothing, as in public void DefineEnd(PipelineBuilder.Lifecycle pipeline) "
                                + "=> pipeline.Stage(First).Stage(Second);"
                            : $"Make it take a {PipelineApi.ServiceTaskBuilder} and compose a stage with Stage and "
                                + "a send with its reply handler with ExternalStage, as in public void "
                                + "DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.ExternalStage(Send, "
                                + "OnReply, timeout: TimeSpan.FromDays(7), onTimeout: OnTimeout).Stage(Archive);"
                    )
            );
            return null;
        }

        steps.Add(method, rewriter, stepArguments);
        var renamed = rewriter.Renames.Count > 0 ? ", with Finally as Stage" : "";
        var merged =
            rewriter.ExternalStages.Count > 0 ? ", with each send and its reply handler as one ExternalStage" : "";
        messages.Ok(
            method.Role switch
            {
                Role.Execute =>
                    $"{location} takes a {PipelineApi.ServiceTaskBuilder} and returns nothing{renamed}{merged}.",
                Role.Phase => $"{location} takes a {PipelineApi.LifecycleBuilder} and returns nothing.",
                _ => $"{location} takes a {PipelineApi.Builder}.{variant}, as the pipelines it is part of"
                    + $"{renamed}{merged}.",
            }
        );
        return rewriter;
    }

    /// <summary>
    /// Plans a service task composition: <c>Finally</c> becomes <c>Stage</c>, each send and its reply handler become
    /// one <c>ExternalStage</c>, and the methods passed as steps are collected for <see cref="StepTies"/>.
    /// </summary>
    private static void PlanServiceTask(
        PipelineMethod method,
        HelperResolver helpers,
        MethodRewriter rewriter,
        List<(ArgumentSyntax Argument, StepRole Role)> stepArguments,
        List<string> unsupported
    )
    {
        if (method.Role == Role.Helper && SimpleName(method.Method.ReturnType) == PreviewApi.ServiceTaskPipeline)
        {
            rewriter.Replace[method.Method.ReturnType] = ServiceTaskBuilderType(method);
        }

        var sends = new List<InvocationExpressionSyntax>();
        var handlers = new List<InvocationExpressionSyntax>();
        foreach (var (name, invocation) in BuilderCalls(method, helpers))
        {
            switch (name)
            {
                case PreviewApi.Finally:
                    rewriter.Renames[invocation] = PipelineApi.Stage;
                    AddStep(stepArguments, Argument(invocation, "work", 0), StepRole.Final);
                    break;
                case PipelineApi.Stage when HasOutArgument(invocation):
                    sends.Add(invocation);
                    break;
                case PipelineApi.Stage:
                    AddStep(stepArguments, Argument(invocation, "work", 0), StepRole.Stage);
                    break;
                case PreviewApi.HandleReplies or PreviewApi.ConcludeOnReplies:
                    handlers.Add(invocation);
                    break;
                case PreviewApi.Build:
                    unsupported.Add($"Build() at line {CallLine(method.File, invocation)}");
                    break;
            }
        }

        PlanExternalStages(method, sends, handlers, rewriter, stepArguments, unsupported);
        if (method.Role == Role.Execute)
        {
            PlanReturns(method, helpers, rewriter, [], unsupported);
        }
    }

    private static void AddStep(
        List<(ArgumentSyntax Argument, StepRole Role)> stepArguments,
        ArgumentSyntax? argument,
        StepRole role
    )
    {
        if (argument is not null)
        {
            stepArguments.Add((argument, role));
        }
    }

    /// <summary>
    /// Plans a lifecycle composition: stages only, ended by <c>Build()</c>, which a <c>Define</c> method no longer
    /// returns.
    /// </summary>
    private static void PlanLifecycle(
        PipelineMethod method,
        HelperResolver helpers,
        MethodRewriter rewriter,
        List<string> unsupported
    )
    {
        var builds = new List<InvocationExpressionSyntax>();
        foreach (var (name, invocation) in BuilderCalls(method, helpers))
        {
            if (name == PreviewApi.Build)
            {
                builds.Add(invocation);
            }
            else if (name != PipelineApi.Stage || HasOutArgument(invocation))
            {
                unsupported.Add($"{name} at line {CallLine(method.File, invocation)}");
            }
        }

        if (
            method.Role == Role.Helper
            && (builds.Count > 0 || SimpleName(method.Method.ReturnType) == PreviewApi.ProcessTaskPipeline)
        )
        {
            unsupported.Add("Build(), which its callers return");
        }
        else if (method.Role == Role.Phase)
        {
            PlanReturns(method, helpers, rewriter, builds, unsupported);
        }
    }

    /// <summary>
    /// <c>PipelineBuilder.ServiceTask</c>, spelled as the method spells the builder it takes.
    /// </summary>
    private static TypeSyntax ServiceTaskBuilderType(PipelineMethod method)
    {
        var builder = method
            .Method.ParameterList.Parameters.Select(static parameter => parameter.Type)
            .OfType<NameSyntax>()
            .FirstOrDefault(type => IsBuilder(type, method.Model));
        return SyntaxFactory.QualifiedName(
            builder?.WithoutTrivia() ?? SyntaxFactory.IdentifierName(PipelineApi.Builder),
            SyntaxFactory.IdentifierName(PipelineApi.ServiceTaskVariant)
        );
    }

    /// <summary>
    /// What would still name the previews' API after the planned rewrite, so that the method is reported rather than
    /// done: a removed builder call or method group that is not provably on something other than the builder, a
    /// <c>PipelineBuilder</c> that is not retyped, such as a type argument, a pipeline type the method does not lose,
    /// and code disabled by a directive that names any of them.
    /// </summary>
    private static IEnumerable<string> Unplaced(PipelineMethod method, HelperResolver helpers, MethodRewriter rewriter)
    {
        var builderCalls = BuilderCalls(method, helpers).Select(static call => call.Invocation).ToHashSet();
        foreach (var invocation in method.Method.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var (receiver, name) = invocation.Expression switch
            {
                MemberAccessExpressionSyntax access => (access.Expression, access.Name.Identifier.ValueText),
                MemberBindingExpressionSyntax binding => (
                    invocation.FirstAncestorOrSelf<ConditionalAccessExpressionSyntax>()?.Expression,
                    binding.Name.Identifier.ValueText
                ),
                _ => (null, null),
            };
            if (
                receiver is not null
                && name is not null
                && PreviewApi.RemovedBuilderMethods.ContainsKey(name)
                && !builderCalls.Contains(invocation)
                && !IsNotBuilder(receiver, method, helpers)
            )
            {
                yield return $"{name} at line {CallLine(method.File, invocation)} on something it cannot tell apart "
                    + "from the builder";
            }
        }

        foreach (var access in method.Method.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            var name = access.Name.Identifier.ValueText;
            if (
                PreviewApi.RemovedBuilderMethods.ContainsKey(name)
                && !(access.Parent is InvocationExpressionSyntax call && call.Expression == access)
                && !IsNotBuilder(access.Expression, method, helpers)
            )
            {
                yield return $"{name} at line {Line(method.File, access)} as a method group";
            }
        }

        foreach (var type in BuilderReferences(method.Method, method.Model).Where(t => !rewriter.Retype.Contains(t)))
        {
            yield return $"a {PipelineApi.Builder} it cannot give a variant at line {Line(method.File, type)}";
        }

        foreach (
            var pipeline in method
                .Method.DescendantNodes()
                .OfType<IdentifierNameSyntax>()
                .Where(name =>
                    name.Identifier.ValueText is PreviewApi.ServiceTaskPipeline or PreviewApi.ProcessTaskPipeline
                    && IsTypeReference(name)
                    && !IsReturnTypeLost(name, method, rewriter)
                )
        )
        {
            yield return $"a {pipeline.Identifier.ValueText} at line {Line(method.File, pipeline)}";
        }

        foreach (
            var disabled in method
                .Method.DescendantTrivia()
                .Where(trivia =>
                    trivia.IsKind(SyntaxKind.DisabledTextTrivia)
                    && trivia.SpanStart >= method.Method.SpanStart
                    && PreviewApi.AnyName.IsMatch(trivia.ToString())
                )
        )
        {
            var line = Line(method.File, disabled.GetLocation().GetLineSpan().StartLinePosition.Line + 1);
            yield return $"code disabled by a preprocessor directive at line {line} that names the previews' "
                + "pipeline API";
        }
    }

    /// <summary>
    /// Whether the name is the method's own return type, which the rewrite replaces: with <c>void</c> in a
    /// <c>Define</c> method, and with the service task builder in a service task helper.
    /// </summary>
    private static bool IsReturnTypeLost(IdentifierNameSyntax name, PipelineMethod method, MethodRewriter rewriter)
    {
        var returnType = method.Method.ReturnType;
        var isReturnType = returnType.Span.Contains(name.Span) && SimpleName(returnType) == name.Identifier.ValueText;
        return isReturnType && (method.Role != Role.Helper || rewriter.Replace.ContainsKey(returnType));
    }

    /// <summary>
    /// Whether the expression is provably not the builder: by its type when the semantic model resolves it, and
    /// otherwise when nothing in it is a name that holds the builder, a field or property whose type names it, the
    /// type itself, or a call to a method of the app that takes or returns it.
    /// </summary>
    private static bool IsNotBuilder(ExpressionSyntax expression, PipelineMethod method, HelperResolver helpers)
    {
        if (
            method.Model is { } model
            && model.SyntaxTree == expression.SyntaxTree
            && model.GetTypeInfo(expression).Type is { TypeKind: not TypeKind.Error } type
        )
        {
            return !IsBuilderSymbol(type);
        }

        return !expression
            .DescendantNodesAndSelf()
            .Any(node =>
                node switch
                {
                    IdentifierNameSyntax identifier => identifier.Identifier.ValueText is var name
                        && (
                            name == PipelineApi.Builder
                            || method.Builders.Contains(name)
                            || helpers.BuilderMembers.Contains(name)
                        ),
                    InvocationExpressionSyntax invocation => helpers.Resolve(invocation, method).Count > 0,
                    _ => false,
                }
            );
    }

    /// <summary>
    /// The written types in the node that are the previews' builder, at any depth, such as a type argument: each the
    /// outermost name that ends with <c>PipelineBuilder</c>, and not one that only qualifies another, such as
    /// <c>PipelineBuilder.ServiceTask</c>.
    /// </summary>
    private static IEnumerable<NameSyntax> BuilderReferences(SyntaxNode node, SemanticModel? model) =>
        node.DescendantNodesAndSelf()
            .OfType<IdentifierNameSyntax>()
            .Select(identifier => BuilderReference(identifier, model))
            .OfType<NameSyntax>();

    private static NameSyntax? BuilderReference(IdentifierNameSyntax identifier, SemanticModel? model)
    {
        if (identifier.Identifier.ValueText != PipelineApi.Builder)
        {
            return null;
        }

        NameSyntax name = identifier;
        while (name.Parent is QualifiedNameSyntax qualified && qualified.Right == name)
        {
            name = qualified;
        }

        var qualifiesAnother = name.Parent switch
        {
            QualifiedNameSyntax qualified => qualified.Left == name,
            MemberAccessExpressionSyntax => true,
            _ => false,
        };
        return !qualifiesAnother && IsBuilder(name, model) ? name : null;
    }

    /// <summary>
    /// Plans every <c>return</c> of a <c>Define</c> method, which returned a pipeline and now returns nothing. A
    /// lifecycle method returned <c>chain.Build()</c>, and <paramref name="builds"/> holds the <c>Build()</c> calls
    /// in it; a service task returned the chain itself. A return of anything else cannot be rewritten.
    /// </summary>
    private static void PlanReturns(
        PipelineMethod method,
        HelperResolver helpers,
        MethodRewriter rewriter,
        List<InvocationExpressionSyntax> builds,
        List<string> unsupported
    )
    {
        var handled = new HashSet<InvocationExpressionSyntax>();
        if (method.Method.ExpressionBody is { Expression: var arrow })
        {
            if (ReturnedChain(arrow, method, helpers, rewriter) is not { } chain)
            {
                unsupported.Add("an expression body that is not a composed pipeline");
                return;
            }

            if (arrow is InvocationExpressionSyntax build)
            {
                handled.Add(build);
            }

            rewriter.EmptyBody = Unwrap(chain) is not InvocationExpressionSyntax and not ThrowExpressionSyntax;
            if (
                rewriter.EmptyBody
                && method
                    .Method.ExpressionBody.DescendantTrivia()
                    .Concat(method.Method.SemicolonToken.LeadingTrivia)
                    .Any(IsDirectiveOrDisabled)
            )
            {
                unsupported.Add("preprocessor directives in an expression body that is only Build()");
                return;
            }
        }

        var returns = method
            .Method.DescendantNodes()
            .OfType<ReturnStatementSyntax>()
            .Where(statement => OwningFunction(statement) == method.Method);
        foreach (var statement in returns)
        {
            if (
                statement.Expression is not { } returned
                || ReturnedChain(returned, method, helpers, rewriter) is not { } chain
            )
            {
                unsupported.Add($"a return at line {Line(method.File, statement)} that is not a composed pipeline");
                continue;
            }

            if (returned is InvocationExpressionSyntax build)
            {
                handled.Add(build);
            }

            var composes =
                Unwrap(chain) is InvocationExpressionSyntax invocation && !rewriter.Strips.Contains(invocation);
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
                unsupported.Add($"an early return at line {Line(method.File, statement)} outside a block");
                continue;
            }

            // Without the chain, a directive inside the return has nothing left to hold in every configuration.
            if (planned is ReturnChange.Remove or ReturnChange.ReturnVoid && HasInnerDirectives(statement))
            {
                unsupported.Add($"preprocessor directives in the return at line {Line(method.File, statement)}");
                continue;
            }

            rewriter.Returns[statement] = planned;
        }

        foreach (var build in builds.Where(build => !handled.Contains(build)))
        {
            unsupported.Add($"Build() at line {CallLine(method.File, build)}");
        }
    }

    /// <summary>
    /// The chain a <c>Define</c> method returns in <paramref name="expression"/>, or <c>null</c> when it returns
    /// something else. A lifecycle method returns <c>chain.Build()</c> on the builder. A service task returns
    /// <c>Finally</c> or <c>ConcludeOnReplies</c> on the builder, which become a chain on it, or a call to an app method
    /// that composes the rest.
    /// </summary>
    private static ExpressionSyntax? ReturnedChain(
        ExpressionSyntax expression,
        PipelineMethod method,
        HelperResolver helpers,
        MethodRewriter rewriter
    )
    {
        if (!rewriter.ReturnsChain)
        {
            return
                expression
                    is InvocationExpressionSyntax
                    {
                        Expression: MemberAccessExpressionSyntax
                        {
                            Name.Identifier.ValueText: PreviewApi.Build,
                            Expression: var chain,
                        },
                        ArgumentList.Arguments.Count: 0,
                    }
                && IsBuilderExpression(chain, method, helpers)
                ? chain
                : null;
        }

        return Unwrap(expression) switch
        {
            ThrowExpressionSyntax thrown => thrown,
            // On something other than the builder, Unplaced reports it.
            InvocationExpressionSyntax
            {
                Expression: MemberAccessExpressionSyntax
                {
                    Name.Identifier.ValueText: PreviewApi.Finally or PreviewApi.ConcludeOnReplies
                },
            } => expression,
            InvocationExpressionSyntax invocation
                when helpers.Resolve(invocation, method) is { Count: > 0 } targets
                    && targets.All(static target =>
                        SimpleName(target.Method.ReturnType) == PreviewApi.ServiceTaskPipeline
                        || IsBuilder(target.Method.ReturnType, target.Model)
                    ) => expression,
            _ => null,
        };
    }

    /// <summary>
    /// An earlier studioctl preview's port stub, as the stub <see cref="ProcessTaskLifecycleMigration"/> writes now.
    /// A <c>Define</c> method with no statements that is not one never compiled, so it is reported.
    /// </summary>
    private static MethodRewriter? PortStub(
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
                    + $"Define{phase}({PipelineApi.LifecycleBuilder} pipeline) and compose its stages on pipeline."
            );
            return null;
        }

        var callName = match.Groups["call"].Value;
        messages.Ok(
            $"{location} was a port stub from an earlier upgrade. It takes a {PipelineApi.LifecycleBuilder} now, "
                + $"and still stops the build until {callName} is ported to stages."
        );
        var stub = ProcessTaskLifecycleMigration
            .Definition(phase, callName, method.Method)
            .WithTriviaFrom(method.Method);
        return new MethodRewriter(PipelineApi.LifecycleVariant, returnsVoid: true, returnsChain: false)
        {
            Replacement = stub,
        };
    }

    /// <summary>
    /// The calls in the method whose receiver is the builder, other than to the app's own extension methods.
    /// </summary>
    private static IEnumerable<(string Name, InvocationExpressionSyntax Invocation)> BuilderCalls(
        PipelineMethod method,
        HelperResolver helpers
    )
    {
        foreach (var invocation in method.Method.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (
                invocation.Expression is MemberAccessExpressionSyntax { Expression: var receiver, Name: var name }
                && IsBuilderExpression(receiver, method, helpers)
                && helpers.Resolve(invocation, method).Count == 0
            )
            {
                yield return (name.Identifier.ValueText, invocation);
            }
        }
    }

    /// <summary>
    /// Whether the expression is the previews' builder: by its type when the semantic model resolves it, and otherwise
    /// a name that holds the builder, a call to an app method declared to return one, or a <c>Stage</c> or
    /// <c>HandleReplies</c> on one of those.
    /// </summary>
    private static bool IsBuilderExpression(ExpressionSyntax expression, PipelineMethod method, HelperResolver helpers)
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
            } when _chainingCalls.Contains(name.Identifier.ValueText) => IsBuilderExpression(receiver, method, helpers),
            InvocationExpressionSyntax invocation => helpers.Resolve(invocation, method) is { Count: > 0 } targets
                && targets.All(static target => IsBuilder(target.Method.ReturnType, target.Model)),
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
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText == PipelineApi.Builder,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText == PipelineApi.Builder
                && IsBuilderNamespace(qualified.Left),
            NullableTypeSyntax nullable => IsBuilder(nullable.ElementType, model),
            _ => false,
        };
    }

    /// <summary>
    /// The previews' builder: the Altinn <c>PipelineBuilder</c> that is not the variants' abstract base.
    /// </summary>
    private static bool IsBuilderSymbol(ITypeSymbol type) =>
        type is INamedTypeSymbol { Name: PipelineApi.Builder, ContainingType: null, IsAbstract: false } named
        && named.ContainingNamespace.ToDisplayString() == PipelineApi.Namespace
        && CSharpSemanticQueries.IsAltinnAppSymbol(named);

    /// <summary>
    /// Whether the expression or name is the builder's namespace, with or without <c>global::</c>.
    /// </summary>
    private static bool IsBuilderNamespace(SyntaxNode node) =>
        node.WithoutTrivia().ToString().Replace("global::", "", StringComparison.Ordinal) == PipelineApi.Namespace;

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
            var identifier in file.Root.DescendantNodes(node => !reported.Contains(node)).OfType<IdentifierNameSyntax>()
        )
        {
            if (BuilderReference(identifier, file.SemanticModel) is { } type)
            {
                lines.Add(file.GetLine(type));
            }
        }

        foreach (var line in lines)
        {
            messages.Todo(
                $"{file.RelativePath}:{Line(file, line)}: this {PipelineApi.Builder} is not a parameter or local of a "
                    + "method that composes a pipeline, so it cannot be given a variant. "
                    + $"Use {PipelineApi.ServiceTaskBuilder} for a service task's or {PipelineApi.LifecycleBuilder} for "
                    + "DefineStart, DefineEnd and DefineAbandon."
            );
        }
    }

    /// <summary>
    /// Whether trivia holds something a reader or the compiler needs: a comment, a preprocessor directive, or the code
    /// a directive disables.
    /// </summary>
    private static bool IsKept(SyntaxTrivia trivia) => IsDirectiveOrDisabled(trivia) || IsComment(trivia);

    private static bool IsComment(SyntaxTrivia trivia) =>
        trivia.IsKind(SyntaxKind.SingleLineCommentTrivia)
        || trivia.IsKind(SyntaxKind.MultiLineCommentTrivia)
        || trivia.IsKind(SyntaxKind.SingleLineDocumentationCommentTrivia)
        || trivia.IsKind(SyntaxKind.MultiLineDocumentationCommentTrivia);

    private static bool IsDirectiveOrDisabled(SyntaxTrivia trivia) =>
        trivia.IsDirective || trivia.IsKind(SyntaxKind.DisabledTextTrivia);

    /// <summary>
    /// The trivia when it holds something to keep, otherwise none.
    /// </summary>
    private static SyntaxTriviaList Keep(IEnumerable<SyntaxTrivia> trivia)
    {
        var list = SyntaxFactory.TriviaList(trivia);
        return list.Any(IsKept) ? list : default;
    }

    /// <summary>
    /// The trivia to keep, on lines of its own: without the whitespace it ends with, and ending with a line break.
    /// </summary>
    private static SyntaxTriviaList OwnLines(IEnumerable<SyntaxTrivia> trivia)
    {
        var list = trivia.ToList();
        if (!list.Any(IsKept))
        {
            return default;
        }

        var lineBreak = list.LastOrDefault(static t => t.IsKind(SyntaxKind.EndOfLineTrivia));
        while (list[^1].IsKind(SyntaxKind.WhitespaceTrivia) || list[^1].IsKind(SyntaxKind.EndOfLineTrivia))
        {
            list.RemoveAt(list.Count - 1);
        }

        // A directive and disabled code end with their own line break.
        if (!list[^1].ToFullString().EndsWith('\n'))
        {
            list.Add(lineBreak.IsKind(SyntaxKind.EndOfLineTrivia) ? lineBreak : SyntaxFactory.LineFeed);
        }

        return SyntaxFactory.TriviaList(list);
    }

    /// <summary>
    /// Whether a preprocessor directive or the code it disables sits between the node's tokens, rather than around it.
    /// </summary>
    private static bool HasInnerDirectives(SyntaxNode node) =>
        node.DescendantTrivia()
            .Any(trivia =>
                IsDirectiveOrDisabled(trivia) && trivia.SpanStart >= node.SpanStart && trivia.SpanStart < node.Span.End
            );

    private static bool HasOutArgument(InvocationExpressionSyntax invocation) =>
        invocation.ArgumentList.Arguments.Any(static argument => argument.RefKindKeyword.IsKind(SyntaxKind.OutKeyword));

    /// <summary>
    /// The argument for the parameter <paramref name="name"/>: named, or in its position.
    /// </summary>
    private static ArgumentSyntax? Argument(InvocationExpressionSyntax invocation, string name, int position)
    {
        var arguments = invocation.ArgumentList.Arguments;
        return arguments.FirstOrDefault(argument => argument.NameColon?.Name.Identifier.ValueText == name)
            ?? (position < arguments.Count && arguments[position].NameColon is null ? arguments[position] : null);
    }

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

    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.ValueText,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            _ => null,
        };

    /// <summary>
    /// The line of the method a call names, which in a chain over several lines is not the line the chain starts on.
    /// </summary>
    private static string CallLine(ScannedCSharpFile file, InvocationExpressionSyntax invocation) =>
        invocation.Expression switch
        {
            MemberAccessExpressionSyntax access => Line(file, access.Name),
            MemberBindingExpressionSyntax binding => Line(file, binding.Name),
            _ => Line(file, invocation),
        };

    /// <summary>
    /// The line of the node, written into a message as a marker for <see cref="ResolveLines"/>, since the step reports
    /// on a file before it rewrites the methods in it.
    /// </summary>
    private static string Line(ScannedCSharpFile file, SyntaxNode node) => Line(file, file.GetLine(node));

    private static string Line(ScannedCSharpFile file, int line) => $"\u27E6{file.Path}\u001F{line}\u27E7";

    /// <summary>
    /// The messages with each line marker replaced by the line it is on once the planned members replace the
    /// originals: moved by what each member above it grew or shrank. A line inside a replaced member keeps its place
    /// relative to the member's first line.
    /// </summary>
    private static List<UpgradeMessage> ResolveLines(
        List<UpgradeMessage> messages,
        Dictionary<ScannedCSharpFile, Dictionary<SyntaxNode, SyntaxNode>> replacements
    )
    {
        var shifts = replacements.ToDictionary(
            static pair => pair.Key.Path,
            static pair =>
                pair.Value.Select(static replacement =>
                        (
                            End: replacement.Key.GetLocation().GetLineSpan().EndLinePosition.Line + 1,
                            Grown: replacement.Value.ToFullString().Count(static c => c == '\n')
                                - replacement.Key.ToFullString().Count(static c => c == '\n')
                        )
                    )
                    .ToList(),
            StringComparer.Ordinal
        );
        return
        [
            .. messages.Select(message =>
                message with
                {
                    Text = LineMarker()
                        .Replace(
                            message.Text,
                            match =>
                            {
                                var line = int.Parse(match.Groups["line"].Value, CultureInfo.InvariantCulture);
                                var moved = shifts
                                    .GetValueOrDefault(match.Groups["path"].Value, [])
                                    .Where(shift => shift.End < line)
                                    .Sum(static shift => shift.Grown);
                                return (line + moved).ToString(CultureInfo.InvariantCulture);
                            }
                        ),
                }
            ),
        ];
    }

    /// <summary>
    /// The noun with its indefinite article.
    /// </summary>
    private static string A(string noun) => ("aeiou".Contains(char.ToLowerInvariant(noun[0])) ? "an " : "a ") + noun;

    private static string Capitalized(string text) => char.ToUpperInvariant(text[0]) + text[1..];

    private static string Location(ScannedCSharpFile file, SyntaxNode node) =>
        $"{file.RelativePath}:{Line(file, node)}";

    private static string MemberName(SyntaxNode function) =>
        (function, function.Parent) switch
        {
            (MethodDeclarationSyntax method, TypeDeclarationSyntax type) =>
                $"{type.Identifier.Text}.{method.Identifier.Text}",
            (MethodDeclarationSyntax method, _) => method.Identifier.Text,
            (LocalFunctionStatementSyntax local, _) => local.Identifier.Text,
            _ => function.ToString(),
        };

    /// <summary>
    /// A line marker that <see cref="Line(ScannedCSharpFile, int)"/> writes.
    /// </summary>
    [GeneratedRegex("\u27E6(?<path>[^\u001F]*)\u001F(?<line>[0-9]+)\u27E7", RegexOptions.CultureInvariant)]
    private static partial Regex LineMarker();

    /// <summary>
    /// The v8 method an earlier preview's port stub names, from its <c>#error</c> line or, once that is removed, its
    /// comment.
    /// </summary>
    [GeneratedRegex(
        @"(?:#error Port (?<call>\w+) to stages in Define|v9 no longer calls (?<call>\w+)\(string taskId)",
        RegexOptions.CultureInvariant
    )]
    private static partial Regex StubCallName();
}
