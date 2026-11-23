using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

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
/// holding such a chain, or at a call that reaches a method of the app declared to return <c>PipelineBuilder</c>, which
/// is found the way C# finds it: in the caller's type and its bases, through a type name or <c>base</c>, or as an
/// extension method. A lifecycle method that
/// only returns <c>pipeline.Build()</c> keeps an empty body rather than being removed: it does what the interface
/// default does, and removing it would break an override of it or a call to it.</p>
/// <p>A helper method that takes or returns a <c>PipelineBuilder</c> gets the variant its callers in the
/// <c>Define</c> methods and its own calls show. When they show both, or neither, it is reported. So is a lifecycle
/// method whose returns are not a composed pipeline's <c>Build()</c>, and a <c>PipelineBuilder</c> written anywhere
/// else, such as a field or a type argument. A method is reported rather than done when something in it would still
/// name the previews' API: a <c>Finally</c>, <c>ConcludeOnReplies</c> or <c>Build</c> call on something the rules
/// cannot tell apart from the builder, a <c>PipelineBuilder</c> they cannot retype, or code disabled by a directive
/// that names either. A doc comment's reference to a builder method the variants lack or overload becomes a code
/// span.</p>
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

    /// <summary>
    /// The previews' builder methods that a doc comment can no longer reference by name, and what each is called now.
    /// The variants' abstract base has none of them.
    /// </summary>
    private static readonly Dictionary<string, string> _docReferenceNames = new(StringComparer.Ordinal)
    {
        ["Stage"] = "Stage",
        ["Finally"] = "Stage",
        ["HandleReplies"] = "HandleReplies",
        ["ConcludeOnReplies"] = "HandleReplies",
        ["Build"] = "Build",
    };

    /// <summary>
    /// The parameters of the previews' service task steps, in order.
    /// </summary>
    private static readonly Dictionary<string, string[]> _stepParameters = new(StringComparer.Ordinal)
    {
        ["Stage"] = ["work", "options"],
        ["Finally"] = ["work", "options"],
        ["HandleReplies"] = ["handle", "onMessage", "onClosed", "options"],
        ["ConcludeOnReplies"] = ["handle", "onMessage", "onClosed", "options"],
    };

    /// <summary>
    /// What the work a service task step takes returns a task of. The service task builder has a step that carries on
    /// and one that ends the task for each, chosen by this, so work whose result has no type, such as a lambda that
    /// throws, fits both.
    /// </summary>
    private static readonly Dictionary<(string Step, string Parameter), string> _workResults = new()
    {
        [("Stage", "work")] = "StageResult",
        [("Finally", "work")] = "ServiceTaskResult",
        [("HandleReplies", "onMessage")] = "StageExchangeResult",
        [("HandleReplies", "onClosed")] = "StageResult",
        [("ConcludeOnReplies", "onMessage")] = "ServiceTaskExchangeResult",
        [("ConcludeOnReplies", "onClosed")] = "ServiceTaskResult",
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

        var helpers = new HelperResolver(files, methods);
        foreach (var method in methods)
        {
            CollectBuilders(method, helpers);
        }

        DecideVariants(methods, helpers);

        var rewrites =
            new Dictionary<ScannedCSharpFile, Dictionary<MethodDeclarationSyntax, MemberDeclarationSyntax>>();
        foreach (var method in methods)
        {
            cancellationToken.ThrowIfCancellationRequested();
            reported.Add(method.Method);
            if (Rewrite(method, helpers, messages) is { } rewritten)
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

        // After the methods, so that a reference in a rewritten method's doc comment is found in its new tree. A
        // snapshot again, of the files those rewrites replaced.
        var documented = _scanner.Files.Where(file => file.SemanticModel is not null || !appDeclaresBuilder).ToArray();
        foreach (var file in documented)
        {
            cancellationToken.ThrowIfCancellationRequested();
            RewriteDocReferences(file, messages);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// Doc comment references to the previews' builder methods that the variants do not have, or have overloaded,
    /// such as <c>&lt;see cref="PipelineBuilder.Finally"/&gt;</c>, become code spans in the new vocabulary:
    /// <c>&lt;c&gt;Stage&lt;/c&gt;</c>. The variants' <c>Stage</c> and <c>HandleReplies</c> are overloaded, so a
    /// reference to one by name alone would be ambiguous.
    /// </summary>
    private void RewriteDocReferences(ScannedCSharpFile file, List<UpgradeMessage> messages)
    {
        var replacements = new Dictionary<XmlNodeSyntax, XmlNodeSyntax>();
        foreach (var attribute in file.Root.DescendantNodes(descendIntoTrivia: true).OfType<XmlCrefAttributeSyntax>())
        {
            if (
                attribute.Cref
                    is not QualifiedCrefSyntax
                    {
                        Container: var container,
                        Member: NameMemberCrefSyntax { Name: SimpleNameSyntax member },
                    }
                || !_docReferenceNames.TryGetValue(member.Identifier.ValueText, out var name)
                || !IsBuilderContainer(container, file.SemanticModel)
            )
            {
                continue;
            }

            switch (attribute.Parent)
            {
                case XmlEmptyElementSyntax { Name.LocalName.ValueText: "see" or "seealso" } element:
                    replacements[element] = CodeSpan([SyntaxFactory.XmlText(name)]).WithTriviaFrom(element);
                    break;
                case XmlElementStartTagSyntax
                {
                    Name.LocalName.ValueText: "see" or "seealso",
                    Parent: XmlElementSyntax element,
                }:
                    replacements[element] = CodeSpan(element.Content).WithTriviaFrom(element);
                    break;
            }
        }

        if (replacements.Count == 0)
        {
            return;
        }

        _scanner.Update(file, file.Root.ReplaceNodes(replacements.Keys, (original, _) => replacements[original]));
        messages.Ok(
            $"{file.RelativePath}: doc comments name {BuilderName} methods that the variants do not have, or have "
                + "overloaded, in code spans instead of references, with Finally as Stage and ConcludeOnReplies as "
                + "HandleReplies."
        );
    }

    private static XmlElementSyntax CodeSpan(SyntaxList<XmlNodeSyntax> content) =>
        SyntaxFactory.XmlElement(
            SyntaxFactory.XmlElementStartTag(SyntaxFactory.XmlName("c")),
            content,
            SyntaxFactory.XmlElementEndTag(SyntaxFactory.XmlName("c"))
        );

    /// <summary>
    /// Whether a doc comment reference's container is the previews' builder: by its symbol when the semantic model
    /// resolves it, and otherwise by how it is written.
    /// </summary>
    private static bool IsBuilderContainer(TypeSyntax container, SemanticModel? model) =>
        model is not null
        && model.SyntaxTree == container.SyntaxTree
        && model.GetSymbolInfo(container).Symbol is ITypeSymbol type
            ? IsBuilderSymbol(type)
            : IsBuilder(container, null);

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
            var variant = method.Role == Role.Execute ? ServiceTaskVariant : LifecycleVariant;
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
        HelperResolver helpers,
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
        foreach (var (name, invocation) in BuilderCalls(method, helpers))
        {
            if (variant == ServiceTaskVariant)
            {
                TypeUntypedWork(method, name, invocation, rewriter, unsupported);
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
                PlanReturns(method, helpers, rewriter, builds, unsupported);
            }
        }

        unsupported.AddRange(Unplaced(method, helpers, rewriter));
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
    /// Plans an explicit return type for each lambda in a service task step whose result has no type, such as
    /// <c>_ => throw new NotImplementedException()</c>, which would otherwise fit both the step that carries on and
    /// the one that ends the task. An anonymous method cannot have one, so it is reported.
    /// </summary>
    private static void TypeUntypedWork(
        PipelineMethod method,
        string step,
        InvocationExpressionSyntax invocation,
        MethodRewriter rewriter,
        List<string> unsupported
    )
    {
        if (!_stepParameters.TryGetValue(step, out var parameters) || HasOutArgument(invocation))
        {
            return;
        }

        var arguments = invocation.ArgumentList.Arguments;
        for (var i = 0; i < arguments.Count; i++)
        {
            var parameter = arguments[i].NameColon?.Name.Identifier.ValueText ?? parameters.ElementAtOrDefault(i);
            if (
                parameter is null
                || !_workResults.TryGetValue((step, parameter), out var result)
                || Unwrap(arguments[i].Expression) is not AnonymousFunctionExpressionSyntax work
                || !HasUntypedResult(work)
            )
            {
                continue;
            }

            if (work is LambdaExpressionSyntax lambda)
            {
                rewriter.ReturnTypes[lambda] = WorkResultType(method, result);
            }
            else
            {
                unsupported.Add(
                    $"an anonymous method at line {method.File.GetLine(work)} whose result has no type, so it "
                        + "fits both the step that carries on and the one that ends the task"
                );
            }
        }
    }

    /// <summary>
    /// Whether nothing the function returns has a type of its own: it only throws, or returns <c>null</c> or
    /// <c>default</c>.
    /// </summary>
    private static bool HasUntypedResult(AnonymousFunctionExpressionSyntax function) =>
        function switch
        {
            ParenthesizedLambdaExpressionSyntax { ReturnType: not null } => false,
            { ExpressionBody: { } body } => HasNoNaturalType(body),
            { Block: { } block } => block
                .DescendantNodes()
                .OfType<ReturnStatementSyntax>()
                .Where(statement => OwningFunction(statement) == function)
                .All(static statement => statement.Expression is null || HasNoNaturalType(statement.Expression)),
            _ => false,
        };

    private static bool HasNoNaturalType(ExpressionSyntax expression) =>
        Unwrap(expression) switch
        {
            ThrowExpressionSyntax => true,
            LiteralExpressionSyntax literal => literal.IsKind(SyntaxKind.NullLiteralExpression)
                || literal.IsKind(SyntaxKind.DefaultLiteralExpression),
            ConditionalExpressionSyntax conditional => HasNoNaturalType(conditional.WhenTrue)
                && HasNoNaturalType(conditional.WhenFalse),
            SwitchExpressionSyntax switchExpression => switchExpression.Arms.All(static arm =>
                HasNoNaturalType(arm.Expression)
            ),
            _ => false,
        };

    /// <summary>
    /// <c>Task&lt;result&gt;</c>, with each name bare when the method's file writes it bare and qualified otherwise.
    /// </summary>
    private static TypeSyntax WorkResultType(PipelineMethod method, string result)
    {
        var names = method.File.Root.DescendantNodes().OfType<SimpleNameSyntax>().ToList();
        var task = names.Any(static name => name.Identifier.ValueText == "Task")
            ? "Task"
            : "global::System.Threading.Tasks.Task";
        var bareBuilder = method
            .Method.DescendantNodes()
            .OfType<IdentifierNameSyntax>()
            .Any(static name =>
                name.Identifier.ValueText == BuilderName
                && !(name.Parent is QualifiedNameSyntax qualified && qualified.Right == name)
            );
        var resultName = bareBuilder ? result : $"global::{BuilderNamespace}.{result}";
        return SyntaxFactory.ParseTypeName($"{task}<{resultName}>");
    }

    /// <summary>
    /// What would still name the previews' API after the planned rewrite, so that the method is reported rather than
    /// done: a <c>Finally</c>, <c>ConcludeOnReplies</c> or <c>Build</c> call that is not provably on something other
    /// than the builder, a <c>PipelineBuilder</c> that is not retyped, such as a type argument, and code disabled by a
    /// directive that names any of them.
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
                && (_endingRenames.ContainsKey(name) || name == "Build")
                && !builderCalls.Contains(invocation)
                && !IsNotBuilder(receiver, method, helpers)
            )
            {
                yield return $"{name} at line {method.File.GetLine(invocation)} on something it cannot tell apart "
                    + "from the builder";
            }
        }

        foreach (var type in BuilderReferences(method.Method, method.Model).Where(t => !rewriter.Retype.Contains(t)))
        {
            yield return $"a {BuilderName} it cannot give a variant at line {method.File.GetLine(type)}";
        }

        foreach (
            var disabled in method
                .Method.DescendantTrivia()
                .Where(trivia =>
                    trivia.IsKind(SyntaxKind.DisabledTextTrivia)
                    && trivia.SpanStart >= method.Method.SpanStart
                    && OldApiName().IsMatch(trivia.ToString())
                )
        )
        {
            yield return $"code disabled by a preprocessor directive at line {disabled.GetLocation().GetLineSpan().StartLinePosition.Line + 1} "
                + $"that names {BuilderName}, Finally, ConcludeOnReplies or Build";
        }
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
                            name == BuilderName
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
        if (identifier.Identifier.ValueText != BuilderName)
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
    /// Plans every <c>return</c> of a lifecycle method, which returned <c>pipeline.Build()</c> and now returns
    /// nothing. A return that is not a chain on the builder ending with <c>Build()</c>, or a <c>Build()</c> anywhere
    /// else, cannot be rewritten.
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
            if (BuiltChain(arrow, method, helpers) is not { } chain)
            {
                unsupported.Add("an expression body that is not a composed pipeline's Build()");
                return;
            }

            handled.Add((InvocationExpressionSyntax)arrow);
            rewriter.EmptyBody = Unwrap(chain) is not InvocationExpressionSyntax;
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
            if (statement.Expression is not { } returned || BuiltChain(returned, method, helpers) is not { } chain)
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

            // Without the chain, a directive inside the return has nothing left to hold in every configuration.
            if (planned is ReturnChange.Remove or ReturnChange.ReturnVoid && HasInnerDirectives(statement))
            {
                unsupported.Add($"preprocessor directives in the return at line {method.File.GetLine(statement)}");
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
        HelperResolver helpers
    ) =>
        expression
            is InvocationExpressionSyntax
            {
                Expression: MemberAccessExpressionSyntax { Name.Identifier.ValueText: "Build", Expression: var chain },
                ArgumentList.Arguments.Count: 0,
            }
        && IsBuilderExpression(chain, method, helpers)
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
                $"{file.RelativePath}:{line}: this {BuilderName} is not a parameter or local of a method that composes "
                    + $"a pipeline, so it cannot be given a variant. Use {BuilderName}.{ServiceTaskVariant} for a "
                    + $"service task's or {BuilderName}.{LifecycleVariant} for DefineStart, DefineEnd and "
                    + "DefineAbandon."
            );
        }
    }

    /// <summary>
    /// The method with an empty block for its expression body, keeping a comment written in the expression body.
    /// </summary>
    private static MethodDeclarationSyntax WithEmptyBody(MethodDeclarationSyntax method)
    {
        var semicolon = method.SemicolonToken;
        var kept = Keep(
                method
                    .ParameterList.CloseParenToken.TrailingTrivia.Concat(
                        method.ExpressionBody?.DescendantTrivia() ?? []
                    )
                    .Concat(semicolon.LeadingTrivia)
            )
            .SkipWhile(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia))
            .Reverse()
            .SkipWhile(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia))
            .Reverse()
            .ToList();
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
                        .WithTrailingTrivia(kept.Prepend(SyntaxFactory.Space)),
                    default,
                    SyntaxFactory
                        .Token(SyntaxKind.CloseBraceToken)
                        .WithLeadingTrivia(
                            kept is [.., var last] && !last.IsKind(SyntaxKind.EndOfLineTrivia)
                                ? SyntaxFactory.TriviaList(SyntaxFactory.Space)
                                : default
                        )
                        .WithTrailingTrivia(semicolon.TrailingTrivia)
                )
            );
    }

    /// <summary>
    /// Whether trivia holds something a reader or the compiler needs: a comment, a preprocessor directive, or the code
    /// a directive disables.
    /// </summary>
    private static bool IsKept(SyntaxTrivia trivia) =>
        IsDirectiveOrDisabled(trivia)
        || trivia.IsKind(SyntaxKind.SingleLineCommentTrivia)
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
    /// The trivia to keep, on lines of its own above a closing brace: without the whitespace it ends with, and ending
    /// with a line break.
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

    private static string Location(ScannedCSharpFile file, SyntaxNode node) =>
        $"{file.RelativePath}:{file.GetLine(node)}";

    private static string MemberName(MethodDeclarationSyntax method) =>
        method.Parent is TypeDeclarationSyntax type
            ? $"{type.Identifier.Text}.{method.Identifier.Text}"
            : method.Identifier.Text;

    /// <summary>
    /// A call of the previews' API that the variants do not have, or <c>PipelineBuilder</c> without a variant.
    /// </summary>
    [GeneratedRegex(
        @"\b(?:Finally|ConcludeOnReplies|Build)\s*\(|\bPipelineBuilder\b(?!\s*\.\s*(?:ServiceTask|Lifecycle)\b)",
        RegexOptions.CultureInvariant
    )]
    private static partial Regex OldApiName();

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
    /// Finds the app's own methods taking or returning the builder that a call reaches: through its symbol when the
    /// semantic model resolves it, and otherwise the way C# looks a method up by name. A bare or <c>this.</c> call
    /// looks in the caller's type and its bases, then for a bare call in its containing types and
    /// <c>using static</c> types; <c>base.</c> looks in the bases; a call through a type name looks in that type;
    /// and a call on the builder looks among extension methods.
    /// </summary>
    private sealed class HelperResolver
    {
        /// <summary>
        /// The calls on the previews' builder that are its own methods, which win over an extension method.
        /// </summary>
        private static readonly HashSet<string> _builderMembers = new(StringComparer.Ordinal)
        {
            "Stage",
            "HandleReplies",
            "Finally",
            "ConcludeOnReplies",
            "Build",
        };

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

                    return caller
                            .File.Root.Usings.Where(static u => u.StaticKeyword != default)
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
                    if (!_builderMembers.Contains(called) && IsBuilderExpression(receiver, caller, this))
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

    /// <summary>
    /// Applies the planned changes to one method.
    /// </summary>
    private sealed class MethodRewriter(string variant, bool returnsVoid) : CSharpSyntaxRewriter
    {
        public HashSet<TypeSyntax> Retype { get; } = [];

        public Dictionary<InvocationExpressionSyntax, string> Renames { get; } = [];

        /// <summary>
        /// The lambdas that get an explicit return type, which a simple lambda needs parentheses for.
        /// </summary>
        public Dictionary<LambdaExpressionSyntax, TypeSyntax> ReturnTypes { get; } = [];

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
                    if (
                        method.ExpressionBody is not { } arrow
                        || visited.ExpressionBody is not { } visitedArrow
                        || EmptyBody
                    )
                    {
                        return visited;
                    }

                    var (chain, before, after) = ChainOf(arrow.Expression);
                    return visited
                        .WithExpressionBody(visitedArrow.WithExpression(chain.WithLeadingTrivia(before)))
                        .WithSemicolonToken(
                            visited.SemicolonToken.WithLeadingTrivia(
                                Keep(after.Concat(visited.SemicolonToken.LeadingTrivia))
                            )
                        );
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
                case LambdaExpressionSyntax lambda when ReturnTypes.TryGetValue(lambda, out var returnType):
                    return WithReturnType(Kept(base.Visit(lambda), lambda), returnType);
                case ReturnStatementSyntax statement
                    when Returns.TryGetValue(statement, out var change) && change == ReturnChange.ReturnVoid:
                    // A comment in the removed value stays, before the semicolon.
                    return statement
                        .WithExpression(null)
                        .WithReturnKeyword(statement.ReturnKeyword.WithTrailingTrivia())
                        .WithSemicolonToken(
                            statement.SemicolonToken.WithLeadingTrivia(
                                Keep(
                                    statement
                                        .ReturnKeyword.TrailingTrivia.Concat(
                                            statement.Expression?.DescendantTrivia() ?? []
                                        )
                                        .Concat(statement.SemicolonToken.LeadingTrivia)
                                )
                            )
                        );
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
                        // A comment or directive around the removed return, and the code a directive disables,
                        // stay above the closing brace.
                        closeBrace = closeBrace.WithLeadingTrivia(
                            OwnLines(returned.DescendantTrivia()).AddRange(closeBrace.LeadingTrivia)
                        );
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
        /// The chain a <c>return chain.Build();</c> composed, as a statement in its place. A comment or directive
        /// between <c>return</c> and the chain stays above it, and one after the chain stays before the semicolon.
        /// </summary>
        private ExpressionStatementSyntax Statement(ReturnStatementSyntax returned)
        {
            var (chain, before, after) = ChainOf(
                returned.Expression ?? throw new InvalidOperationException("A planned return lost its value.")
            );
            var above = Keep(returned.ReturnKeyword.TrailingTrivia.Concat(before))
                .SkipWhile(static trivia =>
                    trivia.IsKind(SyntaxKind.WhitespaceTrivia) || trivia.IsKind(SyntaxKind.EndOfLineTrivia)
                );
            return SyntaxFactory
                .ExpressionStatement(
                    chain,
                    returned.SemicolonToken.WithLeadingTrivia(Keep(after.Concat(returned.SemicolonToken.LeadingTrivia)))
                )
                .WithLeadingTrivia(returned.GetLeadingTrivia().AddRange(above));
        }

        /// <summary>
        /// <c>chain</c> from <c>chain.Build()</c>, with the changes planned inside it, without the trivia around it
        /// and the parentheses, which a statement cannot start with. Also the trivia before and after the chain, which
        /// can hold a directive or comment that goes with what is removed, such as one before <c>.Build()</c>.
        /// </summary>
        private (ExpressionSyntax Chain, SyntaxTriviaList Before, SyntaxTriviaList After) ChainOf(
            ExpressionSyntax built
        )
        {
            var chain = Unwrap(BuiltFrom(built));
            var before = new List<SyntaxTrivia>();
            var after = new List<SyntaxTrivia>(chain.GetTrailingTrivia());
            foreach (var token in built.DescendantTokens())
            {
                if (token.SpanStart < chain.SpanStart)
                {
                    before.AddRange(token.LeadingTrivia);
                    before.AddRange(token.TrailingTrivia);
                }
                else if (token.SpanStart >= chain.Span.End)
                {
                    after.AddRange(token.LeadingTrivia);
                    after.AddRange(token.TrailingTrivia);
                }
            }

            before.AddRange(chain.GetLeadingTrivia());
            return (
                Kept(Visit(chain), chain).WithoutTrivia(),
                SyntaxFactory.TriviaList(before),
                SyntaxFactory.TriviaList(after)
            );
        }

        /// <summary>
        /// The lambda with an explicit return type, after its modifiers, as in
        /// <c>static Task&lt;StageResult&gt; (context) => throw ...</c>.
        /// </summary>
        private static ParenthesizedLambdaExpressionSyntax WithReturnType(
            LambdaExpressionSyntax lambda,
            TypeSyntax returnType
        )
        {
            var parameters = lambda switch
            {
                SimpleLambdaExpressionSyntax simple => SyntaxFactory
                    .ParameterList(SyntaxFactory.SingletonSeparatedList(simple.Parameter.WithoutTrivia()))
                    .WithLeadingTrivia(simple.Parameter.GetLeadingTrivia())
                    .WithTrailingTrivia(simple.Parameter.GetTrailingTrivia()),
                ParenthesizedLambdaExpressionSyntax parenthesized => parenthesized.ParameterList,
                _ => throw new InvalidOperationException($"Unexpected lambda {lambda.Kind()}."),
            };
            // The return type takes the place of the parameters, which follow it after a space.
            var typed = SyntaxFactory.ParenthesizedLambdaExpression(
                lambda.AttributeLists,
                lambda.Modifiers,
                returnType
                    .WithLeadingTrivia(lambda.Modifiers.Count == 0 ? parameters.GetLeadingTrivia() : default)
                    .WithTrailingTrivia(SyntaxFactory.Space),
                parameters.WithLeadingTrivia(),
                lambda.ArrowToken,
                lambda.Block,
                lambda.ExpressionBody
            );
            return lambda.AttributeLists.Count == 0 && lambda.Modifiers.Count == 0
                ? typed
                : typed.WithLeadingTrivia(lambda.GetLeadingTrivia());
        }

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
