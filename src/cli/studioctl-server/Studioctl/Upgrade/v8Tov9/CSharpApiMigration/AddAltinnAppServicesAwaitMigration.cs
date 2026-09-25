using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Rewrites the <c>services.AddAltinnAppServices(config, builder.Environment);</c> call in Program.cs to await
/// the task it returns in v9, which loads the app's resource files before the host is built. The call sits in the
/// template's <c>void ConfigureServices(..)</c> local function, so that function becomes <c>async Task</c> and its
/// call in the top-level statements is awaited too. A call already awaited is left alone, and a call in a shape the
/// rewrite does not understand - a method that returns something, a lambda, a method nothing in the file calls -
/// is reported instead of guessed at. The last one matters for <c>Startup.ConfigureServices</c>: the host calls
/// it by name and takes no notice of a <c>Task</c> it returns, so making it async would silently register nothing.
/// </summary>
/// <remarks>
/// Without the await the container is built while the files may still be loading, and the first request fails
/// with a message naming the missing <c>await</c>. Apps generated from the template have no implicit usings, so
/// <c>using System.Threading.Tasks;</c> is added when <c>Task</c> is introduced and the file does not have it.
/// </remarks>
internal sealed class AddAltinnAppServicesAwaitMigration
{
    private const string MethodName = "AddAltinnAppServices";
    private const string TaskTypeName = "Task";
    private const string TaskNamespace = "System.Threading.Tasks";

    private const string RewriteSummary =
        "AddAltinnAppServices returns a Task in v9, which loads the app files before the host is built, and must be "
        + "awaited. Rewrites:";

    private const string UnresolvedSummary =
        "These AddAltinnAppServices calls could not be rewritten to await the returned Task. Await the call, make "
        + "the enclosing method async Task, and await that method where it is called:";

    private readonly CSharpSourceScanner _scanner;

    public AddAltinnAppServicesAwaitMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate()
    {
        var rewrites = new List<string>();
        var unresolved = new List<string>();

        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        foreach (var file in _scanner.Files.ToArray())
        {
            var plan = Plan(file);
            unresolved.AddRange(plan.Unresolved);
            if (plan.Invocations.Count == 0 && plan.Functions.Count == 0 && plan.CallSites.Count == 0)
            {
                continue;
            }

            var updated = Apply(file, plan);
            _scanner.Update(file, updated);
            rewrites.AddRange(plan.Changes);
        }

        var messages = new List<UpgradeMessage>();
        if (rewrites.Count > 0)
        {
            messages.Warn(RewriteSummary);
            messages.WarnRange(rewrites);
        }

        if (unresolved.Count > 0)
        {
            messages.Todo(UnresolvedSummary);
            messages.WarnRange(unresolved);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// Everything one file needs: the calls to await, the functions to make async, and the calls of those
    /// functions to await in turn. Collected before any rewrite so that the nodes are the file's own.
    /// </summary>
    private sealed class FilePlan
    {
        public HashSet<InvocationExpressionSyntax> Invocations { get; } = [];
        public HashSet<SyntaxNode> Functions { get; } = [];
        public HashSet<InvocationExpressionSyntax> CallSites { get; } = [];
        public List<string> Changes { get; } = [];
        public List<string> Unresolved { get; } = [];
        public bool NeedsTaskUsing { get; set; }
    }

    private static FilePlan Plan(ScannedCSharpFile file)
    {
        var plan = new FilePlan();
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (InvokedName(invocation) != MethodName || invocation.Parent is AwaitExpressionSyntax)
            {
                continue;
            }

            var location = $"{file.RelativePath}:{file.GetLine(invocation)}";
            if (invocation.Parent is AnonymousFunctionExpressionSyntax)
            {
                // The expression body of a lambda: its delegate type decides whether it may become async.
                plan.Unresolved.Add($"{location}: the call is inside a lambda");
                continue;
            }

            if (invocation.Parent is not ExpressionStatementSyntax)
            {
                // The task is used as a value - returned or handed on - which is fine as it is.
                continue;
            }

            // The statement form `services.AddAltinnAppServices(..);` is the one the template ships.
            var function = EnclosingFunction(invocation);
            if (function is null)
            {
                // Directly in the top-level statements: an await there is valid C#.
                plan.Invocations.Add(invocation);
                plan.Changes.Add($"{location}: await services.AddAltinnAppServices(..)");
                continue;
            }

            if (!CanBecomeAsyncTask(function, out var reason))
            {
                plan.Unresolved.Add($"{location}: {reason}");
                continue;
            }

            var callSites = CallSitesOf(file, function).ToList();
            if (function is MethodDeclarationSyntax && callSites.Count == 0)
            {
                plan.Unresolved.Add(
                    $"{location}: nothing in the file calls {FunctionName(function)}, so its callers cannot be "
                        + "updated to await it. A method the host calls, such as Startup.ConfigureServices, cannot "
                        + "become async: move the registration to the top-level statements of Program.cs, or "
                        + "block on the returned Task with .GetAwaiter().GetResult()"
                );
                continue;
            }

            var blockedCallSite = callSites.FirstOrDefault(callSite => !CanAwait(callSite, function));
            if (blockedCallSite is not null)
            {
                plan.Unresolved.Add(
                    $"{location}: {FunctionName(function)} is called from a place that cannot await it "
                        + $"({file.RelativePath}:{file.GetLine(blockedCallSite)})"
                );
                continue;
            }

            plan.Invocations.Add(invocation);
            plan.Changes.Add($"{location}: await services.AddAltinnAppServices(..)");
            if (!IsAsync(function))
            {
                plan.Functions.Add(function);
                plan.NeedsTaskUsing |=
                    ReturnType(function) is PredefinedTypeSyntax { Keyword.RawKind: (int)SyntaxKind.VoidKeyword };
                plan.Changes.Add(
                    $"{file.RelativePath}:{file.GetLine(function)}: {FunctionName(function)} is async Task"
                );
            }

            foreach (var callSite in callSites.Where(callSite => callSite.Parent is not AwaitExpressionSyntax))
            {
                if (plan.CallSites.Add(callSite))
                {
                    plan.Changes.Add(
                        $"{file.RelativePath}:{file.GetLine(callSite)}: await {FunctionName(function)}(..)"
                    );
                }
            }
        }

        return plan;
    }

    private static CompilationUnitSyntax Apply(ScannedCSharpFile file, FilePlan plan)
    {
        var nodes = plan.Invocations.Cast<SyntaxNode>().Concat(plan.Functions).Concat(plan.CallSites).Distinct();
        var updated = file.Root.ReplaceNodes(
            nodes,
            (original, rewritten) =>
            {
                if (original is InvocationExpressionSyntax)
                {
                    return Awaited((ExpressionSyntax)rewritten);
                }

                return rewritten switch
                {
                    LocalFunctionStatementSyntax local => local
                        .WithModifiers(WithAsync(local.Modifiers, local.ReturnType))
                        .WithReturnType(TaskType(local.ReturnType, local.Modifiers.Count == 0)),
                    MethodDeclarationSyntax method => method
                        .WithModifiers(WithAsync(method.Modifiers, method.ReturnType))
                        .WithReturnType(TaskType(method.ReturnType, method.Modifiers.Count == 0)),
                    _ => rewritten,
                };
            }
        );

        if (plan.NeedsTaskUsing && !HasUsing(updated, TaskNamespace))
        {
            updated = updated.AddUsings(
                SyntaxFactory
                    .UsingDirective(SyntaxFactory.ParseName(TaskNamespace))
                    .NormalizeWhitespace()
                    .WithTrailingTrivia(SyntaxFactory.LineFeed)
            );
        }

        return updated;
    }

    private static ExpressionSyntax Awaited(ExpressionSyntax expression) =>
        SyntaxFactory
            .AwaitExpression(
                SyntaxFactory.Token(SyntaxKind.AwaitKeyword).WithTrailingTrivia(SyntaxFactory.Space),
                expression.WithoutLeadingTrivia()
            )
            .WithLeadingTrivia(expression.GetLeadingTrivia());

    /// <summary>
    /// <c>void</c> becomes <c>Task</c>; a function that already returns <c>Task</c> keeps its type. When the
    /// function had no modifiers, the new <c>async</c> keyword took over the return type's leading trivia (the
    /// indentation), so the return type gives it up.
    /// </summary>
    private static TypeSyntax TaskType(TypeSyntax returnType, bool hadNoModifiers)
    {
        var type = returnType is PredefinedTypeSyntax { Keyword.RawKind: (int)SyntaxKind.VoidKeyword }
            ? SyntaxFactory.IdentifierName(TaskTypeName).WithTriviaFrom(returnType)
            : returnType;
        return hadNoModifiers ? type.WithoutLeadingTrivia() : type;
    }

    private static SyntaxTokenList WithAsync(SyntaxTokenList modifiers, TypeSyntax returnType)
    {
        if (modifiers.Any(SyntaxKind.AsyncKeyword))
        {
            return modifiers;
        }

        // The async keyword takes over the return type's leading trivia (the indentation), so the signature
        // keeps its place on the line.
        var asyncKeyword = SyntaxFactory
            .Token(SyntaxKind.AsyncKeyword)
            .WithLeadingTrivia(modifiers.Count == 0 ? returnType.GetLeadingTrivia() : SyntaxFactory.TriviaList())
            .WithTrailingTrivia(SyntaxFactory.Space);
        return modifiers.Add(asyncKeyword);
    }

    private static bool HasUsing(CompilationUnitSyntax root, string namespaceName) =>
        root.Usings.Any(directive => directive.Name?.ToString() == namespaceName);

    /// <summary>The local function or method the node sits in, or null in the top-level statements.</summary>
    private static SyntaxNode? EnclosingFunction(SyntaxNode node)
    {
        for (SyntaxNode? current = node.Parent; current is not null; current = current.Parent)
        {
            switch (current)
            {
                case LocalFunctionStatementSyntax or MethodDeclarationSyntax:
                    return current;
                case AnonymousFunctionExpressionSyntax:
                    // A lambda: rewriting its signature is beyond what this migration knows about the delegate
                    // type it must satisfy.
                    return current;
                case GlobalStatementSyntax:
                    return null;
            }
        }

        return null;
    }

    private static bool CanBecomeAsyncTask(SyntaxNode function, out string reason)
    {
        reason = "";
        switch (function)
        {
            case AnonymousFunctionExpressionSyntax:
                reason = "the call is inside a lambda";
                return false;
            case LocalFunctionStatementSyntax or MethodDeclarationSyntax:
                var returnType = ReturnType(function);
                if (IsAsync(function))
                {
                    if (IsTask(returnType))
                    {
                        return true;
                    }

                    reason = $"{FunctionName(function)} is async but does not return Task";
                    return false;
                }

                if (
                    returnType is PredefinedTypeSyntax { Keyword.RawKind: (int)SyntaxKind.VoidKeyword }
                    || IsTask(returnType)
                )
                {
                    return true;
                }

                reason = $"{FunctionName(function)} returns {returnType}, so it cannot become async Task";
                return false;
            default:
                reason = "the call is in an unexpected place";
                return false;
        }
    }

    private static bool IsTask(TypeSyntax type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text == TaskTypeName,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text == TaskTypeName,
            _ => false,
        };

    private static bool IsAsync(SyntaxNode function) => Modifiers(function).Any(SyntaxKind.AsyncKeyword);

    private static SyntaxTokenList Modifiers(SyntaxNode function) =>
        function switch
        {
            LocalFunctionStatementSyntax local => local.Modifiers,
            MethodDeclarationSyntax method => method.Modifiers,
            _ => default,
        };

    private static TypeSyntax ReturnType(SyntaxNode function) =>
        function switch
        {
            LocalFunctionStatementSyntax local => local.ReturnType,
            MethodDeclarationSyntax method => method.ReturnType,
            _ => throw new ArgumentException("Not a function", nameof(function)),
        };

    private static string FunctionName(SyntaxNode function) =>
        function switch
        {
            LocalFunctionStatementSyntax local => local.Identifier.Text,
            MethodDeclarationSyntax method => method.Identifier.Text,
            _ => "the enclosing function",
        };

    /// <summary>
    /// Calls of the function as expression statements, which is how the template calls ConfigureServices. A call
    /// nested in an expression is left for the human.
    /// </summary>
    private static IEnumerable<InvocationExpressionSyntax> CallSitesOf(ScannedCSharpFile file, SyntaxNode function)
    {
        var name = FunctionName(function);
        foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (invocation.Expression is IdentifierNameSyntax identifier && identifier.Identifier.Text == name)
            {
                yield return invocation;
            }
        }
    }

    /// <summary>
    /// A call can be awaited when it is a statement of its own in the top-level statements, or inside a function
    /// that is (or is being made) async. The template calls ConfigureServices from the top-level statements.
    /// </summary>
    private static bool CanAwait(InvocationExpressionSyntax callSite, SyntaxNode function)
    {
        if (callSite.Parent is AwaitExpressionSyntax)
        {
            return true;
        }

        if (callSite.Parent is not ExpressionStatementSyntax)
        {
            return false;
        }

        var enclosing = EnclosingFunction(callSite);
        return enclosing is null || enclosing == function || (IsAsync(enclosing) && IsTask(ReturnType(enclosing)));
    }

    private static string? InvokedName(InvocationExpressionSyntax invocation) =>
        invocation.Expression switch
        {
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text,
            SimpleNameSyntax simple => simple.Identifier.Text,
            _ => null,
        };
}
