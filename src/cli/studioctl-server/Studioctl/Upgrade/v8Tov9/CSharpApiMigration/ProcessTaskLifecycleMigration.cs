using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Auto-migration for the <c>IProcessTask</c> lifecycle members v9 removes. In v8 a process task implemented
/// <c>Start</c>, <c>End</c> and <c>Abandon</c>, each <c>(string taskId, Instance instance)</c>, and the libraries
/// called them as the process moved. v9 has no such members: a task composes the work for each phase as stages with
/// <c>DefineStart</c>, <c>DefineEnd</c> and <c>DefineAbandon</c>, and the defaults compose nothing, so a v8
/// implementation would compile and then silently do nothing when the task starts, ends or is abandoned.
/// </summary>
/// <remarks>
/// <p>Each v8 method gets a <c>Define</c> member beside it that runs it as the phase's one stage, with the task id and
/// the instance read from the stage's context. The method's body is left as it is: the rewrite gets the app
/// behaving as before and compiling, and a warning points at the two things worth doing by hand, splitting the work
/// into stages and reading instance data through the stage's data mutator. An explicit implementation becomes a
/// private method, since v9 has no interface member for it to implement. A type that already composes the phase
/// keeps what it has; its v8 method stays as the type's own method.</p>
/// <p>With a semantic model, the types are the ones whose interfaces include the Altinn <c>IProcessTask</c>; without
/// one, the ones whose own base list names it, which a same-named interface declared in the app makes ambiguous, so
/// such matches are reported instead of rewritten.</p>
/// </remarks>
internal sealed class ProcessTaskLifecycleMigration
{
    private const string InterfaceNamespace = "Altinn.App.Core.Internal.Process.ProcessTasks";
    private const string InterfaceName = "IProcessTask";
    private const string PipelineTypeName = "Altinn.App.Core.Features.Process.ProcessTaskPipeline";
    private const string BuilderTypeName = "Altinn.App.Core.Features.Process.PipelineBuilder";
    private const string StageResultTypeName = "Altinn.App.Core.Features.Process.StageResult";

    private static readonly string[] _phases = ["Start", "End", "Abandon"];
    private static readonly string[] _legacyParameterTypes = ["string", "Instance"];

    private sealed record Rewrite(
        ScannedCSharpFile File,
        MethodDeclarationSyntax Method,
        string Phase,
        bool AddDefinition,
        bool ToPrivate
    );

    private readonly CSharpSourceScanner _scanner;

    public ProcessTaskLifecycleMigration(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Migrate(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var messages = new List<UpgradeMessage>();
        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = _scanner.Files.ToArray();
        var appDeclaresInterface = files
            .SelectMany(static file => file.Root.DescendantNodes().OfType<InterfaceDeclarationSyntax>())
            .Any(static declaration => declaration.Identifier.ValueText == InterfaceName);

        var rewrites = new List<Rewrite>();
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var type in file.Root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                if (!ImplementsProcessTask(file, type, appDeclaresInterface, messages, cancellationToken))
                {
                    continue;
                }

                rewrites.AddRange(FindRewrites(file, type, messages));
            }
        }

        foreach (var fileRewrites in rewrites.GroupBy(static rewrite => rewrite.File))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var file = fileRewrites.Key;
            var byMethod = fileRewrites.ToDictionary(static rewrite => rewrite.Method);
            var root = file.Root.TrackNodes(byMethod.Keys);
            foreach (var (original, rewrite) in byMethod)
            {
                var current =
                    root.GetCurrentNode(original) ?? throw new InvalidOperationException("Tracked node lost.");
                var method = rewrite.ToPrivate ? MakePrivate(current) : current;
                var replacements = rewrite.AddDefinition
                    ? new MemberDeclarationSyntax[] { method, Definition(rewrite.Phase, current) }
                    : [method];
                root = root.ReplaceNode(current, replacements);
            }

            _scanner.Update(file, root);
        }

        return new MigrationResult(messages);
    }

    /// <summary>
    /// Whether the type implements the Altinn <c>IProcessTask</c>: through its interfaces when the file has a
    /// semantic model, otherwise by its own base list, which a same-named interface in the app makes ambiguous.
    /// </summary>
    private static bool ImplementsProcessTask(
        ScannedCSharpFile file,
        TypeDeclarationSyntax type,
        bool appDeclaresInterface,
        List<UpgradeMessage> messages,
        CancellationToken cancellationToken
    )
    {
        if (file.SemanticModel is { } semanticModel)
        {
            return semanticModel.GetDeclaredSymbol(type, cancellationToken) is { } symbol
                && symbol.AllInterfaces.Any(IsSdkProcessTask);
        }

        var listsInterface = (type.BaseList?.Types ?? default).Any(static baseType =>
            SimpleName(baseType.Type) == InterfaceName
        );
        if (listsInterface && appDeclaresInterface)
        {
            messages.Todo(
                $"{file.RelativePath}:{file.GetLine(type)}: {type.Identifier.Text} may implement the v9 {InterfaceName} "
                    + "or the app's own interface of that name, which cannot be told apart without a compilation of the "
                    + "app. If it implements the Altinn one, compose its Start, End and Abandon work with DefineStart, "
                    + "DefineEnd and DefineAbandon by hand."
            );
            return false;
        }

        return listsInterface;
    }

    /// <summary>The v8 lifecycle methods the type declares itself, and what to do with each.</summary>
    private static IEnumerable<Rewrite> FindRewrites(
        ScannedCSharpFile file,
        TypeDeclarationSyntax type,
        List<UpgradeMessage> messages
    )
    {
        var methods = type.Members.OfType<MethodDeclarationSyntax>().ToList();
        foreach (var phase in _phases)
        {
            var method = methods.FirstOrDefault(method =>
                method.Identifier.ValueText == phase
                && HasParameterTypes(method, _legacyParameterTypes)
                && (
                    method.ExplicitInterfaceSpecifier is null
                    || SimpleName(method.ExplicitInterfaceSpecifier.Name) == InterfaceName
                )
            );
            if (method is null)
            {
                continue;
            }

            var location = $"{file.RelativePath}:{file.GetLine(method)}: {type.Identifier.Text}.{phase}";
            var makePrivate = method.ExplicitInterfaceSpecifier is not null;
            var definitionName = "Define" + phase;
            if (methods.Any(other => other.Identifier.ValueText == definitionName))
            {
                messages.Warn(
                    $"{location}(string taskId, Instance instance) is no longer part of {InterfaceName}, and the app "
                        + $"libraries do not call it: {type.Identifier.Text} composes {definitionName}, which runs instead."
                        + (makePrivate ? " It stays as the type's own private method." : "")
                );
                if (makePrivate)
                {
                    yield return new Rewrite(file, method, phase, AddDefinition: false, ToPrivate: true);
                }

                continue;
            }

            messages.Warn(
                $"{location}(string taskId, Instance instance) is no longer part of {InterfaceName}; v9 runs the "
                    + $"stages {definitionName} composes. Added a {definitionName} that runs {phase} as one stage. Split "
                    + "the work into stages that are saved and retried on their own, and read and change instance "
                    + "data through context.InstanceDataMutator."
            );
            yield return new Rewrite(file, method, phase, AddDefinition: true, ToPrivate: makePrivate);
        }
    }

    /// <summary>
    /// The <c>Define</c> member that runs the v8 method as the phase's one stage, laid out below the method with its
    /// indentation. The task id is the instance's current task: for a start that is the task being entered, since
    /// the process state is moved in memory before the start stages run, and for an end or abandon the task being
    /// left. The type references are emitted qualified for the final pass against the upgraded project to simplify.
    /// </summary>
    private static MemberDeclarationSyntax Definition(string phase, MethodDeclarationSyntax method)
    {
        var indent = Indentation(method);
        var text = $$"""

            {{indent}}public global::{{PipelineTypeName}} Define{{phase}}(global::{{BuilderTypeName}} pipeline) =>
            {{indent}}    pipeline
            {{indent}}        .Stage(async context =>
            {{indent}}        {
            {{indent}}            await {{phase}}(
            {{indent}}                context.InstanceDataMutator.Instance.Process?.CurrentTask?.ElementId
            {{indent}}                    ?? throw new System.InvalidOperationException("The instance has no current task."),
            {{indent}}                context.InstanceDataMutator.Instance
            {{indent}}            );
            {{indent}}            return global::{{StageResultTypeName}}.Completed();
            {{indent}}        })
            {{indent}}        .Build();

            """;
        var member =
            SyntaxFactory.ParseMemberDeclaration(text)
            ?? throw new InvalidOperationException("The generated lifecycle definition did not parse.");
        return member.ReplaceNodes(
            member
                .DescendantNodes()
                .OfType<NameSyntax>()
                .Where(static name =>
                    name.Parent is not NameSyntax
                    && name.ToString()
                        is "global::" + PipelineTypeName
                            or "global::" + BuilderTypeName
                            or "global::" + StageResultTypeName
                ),
            static (original, _) =>
                GeneratedTypeReferenceFinalizer
                    .Reference(original.ToString()["global::".Length..])
                    .WithTriviaFrom(original)
        );
    }

    /// <summary>
    /// The explicit implementation as the type's own private method: v9 has no member for it to implement. The
    /// leading trivia, a doc comment included, moves from the return type to the new modifier.
    /// </summary>
    private static MethodDeclarationSyntax MakePrivate(MethodDeclarationSyntax method)
    {
        var leading = method.GetLeadingTrivia();
        var modifiers = SyntaxFactory.TokenList(
            SyntaxFactory
                .Token(SyntaxKind.PrivateKeyword)
                .WithLeadingTrivia(leading)
                .WithTrailingTrivia(SyntaxFactory.Space)
        );
        return method
            .WithExplicitInterfaceSpecifier(null)
            .WithReturnType(method.ReturnType.WithoutLeadingTrivia())
            .WithModifiers(modifiers);
    }

    /// <summary>The whitespace the method's first token is indented with, so the new member lines up with it.</summary>
    private static string Indentation(MethodDeclarationSyntax method) =>
        method.GetLeadingTrivia().LastOrDefault(static trivia => trivia.IsKind(SyntaxKind.WhitespaceTrivia)).ToString();

    private static bool IsSdkProcessTask(INamedTypeSymbol contract) =>
        contract.Name == InterfaceName
        && contract.ContainingNamespace.ToDisplayString() == InterfaceNamespace
        && CSharpSemanticQueries.IsAltinnAppSymbol(contract);

    /// <summary>Whether the method's parameters have exactly the given simple type names, in order.</summary>
    private static bool HasParameterTypes(MethodDeclarationSyntax method, string[] typeNames)
    {
        var parameters = method.ParameterList.Parameters;
        return parameters.Count == typeNames.Length
            && parameters.Zip(typeNames).All(pair => SimpleName(pair.First.Type) == pair.Second);
    }

    /// <summary>The simple name of a written type: the identifier of a generic or qualified name, without a nullable annotation.</summary>
    private static string? SimpleName(TypeSyntax? type) =>
        type switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            GenericNameSyntax generic => generic.Identifier.Text,
            QualifiedNameSyntax qualified => qualified.Right.Identifier.Text,
            AliasQualifiedNameSyntax alias => alias.Name.Identifier.Text,
            NullableTypeSyntax nullable => SimpleName(nullable.ElementType),
            PredefinedTypeSyntax predefined => predefined.Keyword.Text,
            _ => null,
        };
}
