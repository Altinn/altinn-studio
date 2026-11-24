using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PreviewPipelineMigration
{
    private const string ForwardExceptionName = "ServiceTaskReplyForwardException";
    private const string ForwarderName = "IServiceTaskReplyForwarder";

    /// <summary>
    /// The previews' types that were renamed, and their names now.
    /// </summary>
    private static readonly Dictionary<string, string> _typeRenames = new(StringComparer.Ordinal)
    {
        ["ServiceTaskMailbox"] = "ReplyAddress",
        ["SuccessfulServiceTaskResult"] = "EndedServiceTaskResult",
        ["StageAwaitNextReplyResult"] = "ServiceTaskAwaitNextReplyResult",
    };

    /// <summary>
    /// A member of the previews that was renamed.
    /// </summary>
    /// <param name="OnInstance">Whether it is read on an instance of the type, rather than through the type's name.</param>
    /// <param name="Returned">
    /// The type the member returned in the previews where the renamed one returns its base, or <c>null</c>.
    /// </param>
    private sealed record MemberRename(
        string Type,
        string Member,
        string Renamed,
        bool OnInstance = false,
        string? Returned = null
    );

    private static readonly MemberRename[] _memberRenames =
    [
        new("ServiceTaskResult", "Success", "EndTask", Returned: "SuccessfulServiceTaskResult"),
        new("ServiceTaskReplyForwardOutcome", "MailboxFull", "TooManyReplies"),
        new(ForwardExceptionName, "MailboxId", "ReplyAddressId", OnInstance: true),
    ];

    /// <summary>
    /// The previews' types that the current API removed, and what to write instead.
    /// </summary>
    private static readonly Dictionary<string, string> _removedTypes = new(StringComparer.Ordinal)
    {
        ["MailboxHandle"] =
            "Compose the send and its reply handler as one ExternalStage(send, onReply, timeout: ..., onTimeout: ...)",
        ["MailboxOptions"] = "Give ExternalStage the timeout as timeout:",
        ["MailboxClosedReason"] = "onTimeout takes only the StageContext, and runs when the timeout passes",
        ["StageExchangeResult"] = "A reply handler returns ServiceTaskReplyResult",
        ["ServiceTaskExchangeResult"] = "A reply handler returns ServiceTaskReplyResult",
        ["ServiceTaskOpeningStageResult"] =
            "A send returns ServiceTaskResult, and returns the result itself where it returned Conclude(result)",
        [ServiceTaskPipelineName] =
            "DefineExecute returns nothing, and a method that composes part of it returns PipelineBuilder.ServiceTask",
        [ProcessTaskPipelineName] =
            "DefineStart, DefineEnd and DefineAbandon return nothing, and a method that composes part of one returns "
            + "PipelineBuilder.Lifecycle",
    };

    /// <summary>
    /// Which names the app declares as its own types, so that without a compilation a name is taken for the Altinn
    /// one only when the app does not declare it.
    /// </summary>
    private sealed class TypeNames(IEnumerable<ScannedCSharpFile> files)
    {
        private readonly HashSet<string> _declared = files
            .SelectMany(static file => file.Root.DescendantNodes())
            .Select(static node =>
                node switch
                {
                    BaseTypeDeclarationSyntax type => type.Identifier.ValueText,
                    DelegateDeclarationSyntax type => type.Identifier.ValueText,
                    _ => null,
                }
            )
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);

        public bool AppDeclares(string name) => _declared.Contains(name);

        /// <summary>
        /// Whether the name refers to the Altinn type of that name in the pipeline namespace.
        /// </summary>
        public bool IsAltinn(IdentifierNameSyntax name, SemanticModel? model)
        {
            if (model is not null && model.SyntaxTree == name.SyntaxTree)
            {
                var info = model.GetSymbolInfo(name);
                if ((info.Symbol ?? info.CandidateSymbols.FirstOrDefault()) is { } symbol)
                {
                    return symbol is INamedTypeSymbol type
                        && CSharpSemanticQueries.IsAltinnAppSymbol(type)
                        && type.ContainingNamespace.ToDisplayString() == BuilderNamespace;
                }
            }

            return !AppDeclares(name.Identifier.ValueText);
        }
    }

    /// <summary>
    /// Whether the name stands for a type: written as one, or as the receiver of a static member, rather than as a
    /// member's name or a qualifier of another type.
    /// </summary>
    private static bool IsTypeReference(IdentifierNameSyntax name) =>
        name.Parent switch
        {
            QualifiedNameSyntax qualified => qualified.Right == name && IsBuilderNamespace(qualified.Left),
            MemberAccessExpressionSyntax access => access.Expression == name || IsBuilderNamespace(access.Expression),
            NameColonSyntax or NameEqualsSyntax or AliasQualifiedNameSyntax => false,
            _ => true,
        };

    /// <summary>
    /// Whether the expression names the Altinn type <paramref name="typeName"/>, bare or qualified with its namespace.
    /// </summary>
    private static bool NamesAltinnType(
        SyntaxNode expression,
        string typeName,
        TypeNames names,
        SemanticModel? model
    ) =>
        expression switch
        {
            IdentifierNameSyntax identifier => identifier.Identifier.ValueText == typeName
                && names.IsAltinn(identifier, model),
            MemberAccessExpressionSyntax { Name.Identifier.ValueText: var name } access => name == typeName
                && IsBuilderNamespace(access.Expression),
            QualifiedNameSyntax { Right.Identifier.ValueText: var name } qualified => name == typeName
                && IsBuilderNamespace(qualified.Left),
            _ => false,
        };

    /// <summary>
    /// Marks a call to a renamed member whose result the app holds as the type the previews' member returned, which
    /// the renamed one does not return, so that <see cref="RenameRewriter"/> leaves it and reports it. Runs before
    /// anything is rewritten, so that it sees the code as the app wrote it, and the semantic model still binds it.
    /// </summary>
    private void MarkHeldResults(TypeNames names)
    {
        foreach (var file in _scanner.Files.ToArray())
        {
            var held = file
                .Root.DescendantNodes()
                .OfType<InvocationExpressionSyntax>()
                .Where(call =>
                    call.Expression is MemberAccessExpressionSyntax access
                    && _memberRenames.Any(rename =>
                        rename is { OnInstance: false, Returned: { } returned }
                        && rename.Member == access.Name.Identifier.ValueText
                        && NamesAltinnType(access.Expression, rename.Type, names, file.SemanticModel)
                        && IsHeldAs(call, returned, file.SemanticModel)
                    )
                )
                .ToList();
            if (held.Count > 0)
            {
                _scanner.Update(
                    file,
                    file.Root.ReplaceNodes(held, static (_, call) => call.WithAdditionalAnnotations(_heldAsReturned))
                );
            }
        }
    }

    /// <summary>
    /// Makes the renames that mean the same wherever they stand, and reports them per file, with each call
    /// <see cref="MarkHeldResults"/> marked, which it leaves as it is.
    /// </summary>
    private void RenameEverywhere(ScannedCSharpFile file, TypeNames names, List<UpgradeMessage> messages)
    {
        var rewriter = new RenameRewriter(names, file.SemanticModel);
        var renamed = MethodRewriter.Kept(rewriter.Visit(file.Root), file.Root);
        foreach (var (call, rename, returned) in rewriter.Held)
        {
            messages.Todo(
                $"{file.RelativePath}:{file.GetLine(call)}: {rename.Type}.{rename.Member} returned the "
                    + $"{returned} this code holds, so it was left as it is. {rename.Type}.{rename.Renamed} returns a "
                    + $"{rename.Type}: keep what you read from the result in a variable of its own, or match the "
                    + $"result with is {_typeRenames.GetValueOrDefault(returned, returned)}."
            );
        }

        if (rewriter.Renamed.Count == 0)
        {
            return;
        }

        _scanner.Update(file, renamed);
        messages.Ok($"{file.RelativePath}: {string.Join(", ", rewriter.Renamed)}, as the current API names them.");
    }

    /// <summary>
    /// Renames the previews' renamed types and members: <c>ServiceTaskResult.Success</c> is <c>EndTask</c>,
    /// <c>ServiceTaskMailbox</c> is <c>ReplyAddress</c>, the reply forwarder says reply address where it said
    /// mailbox, and so on. Doc comment references are renamed with them. A method left as it is is not changed.
    /// </summary>
    private sealed class RenameRewriter(TypeNames names, SemanticModel? model)
        : CSharpSyntaxRewriter(visitIntoStructuredTrivia: true)
    {
        public SortedSet<string> Renamed { get; } = new(StringComparer.Ordinal);

        /// <summary>
        /// The calls left as they are because their result is held as the type the previews' member returned.
        /// </summary>
        public List<(InvocationExpressionSyntax Call, MemberRename Rename, string Returned)> Held { get; } = [];

        public override SyntaxNode? Visit(SyntaxNode? node) =>
            node?.HasAnnotation(_leftAsItIs) == true ? node : base.Visit(node);

        public override SyntaxNode? VisitIdentifierName(IdentifierNameSyntax node)
        {
            if (
                _typeRenames.TryGetValue(node.Identifier.ValueText, out var renamed)
                && IsTypeReference(node)
                && names.IsAltinn(node, model)
            )
            {
                Renamed.Add($"{node.Identifier.ValueText} is {renamed}");
                return node.WithIdentifier(SyntaxFactory.Identifier(renamed).WithTriviaFrom(node.Identifier));
            }

            return base.VisitIdentifierName(node);
        }

        public override SyntaxNode? VisitMemberAccessExpression(MemberAccessExpressionSyntax node)
        {
            var visited = (MemberAccessExpressionSyntax?)base.VisitMemberAccessExpression(node) ?? node;
            var member = node.Name.Identifier.ValueText;
            foreach (var rename in _memberRenames.Where(rename => rename.Member == member))
            {
                var matches = rename.OnInstance
                    ? IsOfAltinnType(node.Expression, rename.Type, names, model) == true
                    : NamesAltinnType(node.Expression, rename.Type, names, model);
                if (!matches)
                {
                    continue;
                }

                if (
                    rename.Returned is { } returned
                    && node.Parent is InvocationExpressionSyntax call
                    && call.Expression == node
                    && call.HasAnnotation(_heldAsReturned)
                )
                {
                    Held.Add((call, rename, returned));
                    return visited;
                }

                Renamed.Add($"{rename.Type}.{rename.Member} is {rename.Renamed}");
                return visited.WithName(SyntaxFactory.IdentifierName(rename.Renamed).WithTriviaFrom(visited.Name));
            }

            return visited;
        }

        public override SyntaxNode? VisitQualifiedCref(QualifiedCrefSyntax node)
        {
            var visited = (QualifiedCrefSyntax?)base.VisitQualifiedCref(node) ?? node;
            if (node.Member is not NameMemberCrefSyntax { Name: IdentifierNameSyntax member })
            {
                return visited;
            }

            foreach (var (type, from, to, _, _) in _memberRenames)
            {
                if (member.Identifier.ValueText == from && NamesAltinnType(node.Container, type, names, model))
                {
                    Renamed.Add($"{type}.{from} is {to}");
                    return visited.WithMember(
                        SyntaxFactory.NameMemberCref(SyntaxFactory.IdentifierName(to)).WithTriviaFrom(visited.Member)
                    );
                }
            }

            return visited;
        }

        public override SyntaxNode? VisitArgument(ArgumentSyntax node)
        {
            var visited = (ArgumentSyntax?)base.VisitArgument(node) ?? node;
            if (
                node.NameColon is { Name.Identifier.ValueText: "mailboxId" } nameColon
                && node.Parent?.Parent is { } call
                && TakesReplyAddressId(call, names, model) == true
            )
            {
                Renamed.Add("the reply forwarder's mailboxId is replyAddressId");
                return visited.WithNameColon(
                    nameColon.WithName(SyntaxFactory.IdentifierName("replyAddressId").WithTriviaFrom(nameColon.Name))
                );
            }

            return visited;
        }

        public override SyntaxNode? VisitSubpattern(SubpatternSyntax node)
        {
            var visited = (SubpatternSyntax?)base.VisitSubpattern(node) ?? node;
            if (
                node.NameColon is { Name.Identifier.ValueText: "MailboxId" } nameColon
                && MatchesForwardException(node, names, model) == true
            )
            {
                Renamed.Add($"{ForwardExceptionName}.MailboxId is ReplyAddressId");
                return visited.WithNameColon(
                    nameColon.WithName(SyntaxFactory.IdentifierName("ReplyAddressId").WithTriviaFrom(nameColon.Name))
                );
            }

            return visited;
        }
    }

    /// <summary>
    /// Whether the call is the Altinn reply forwarder's <c>ForwardReply</c> or the forward exception's constructor,
    /// which named <c>replyAddressId</c> <c>mailboxId</c> in the previews: by the method the semantic model binds it
    /// to, and otherwise by the type its receiver is declared with. A call without a receiver is the app's own.
    /// <c>null</c> when the upgrade cannot tell.
    /// </summary>
    private static bool? TakesReplyAddressId(SyntaxNode call, TypeNames names, SemanticModel? model)
    {
        if (call is ObjectCreationExpressionSyntax creation)
        {
            return NamesAltinnType(creation.Type, ForwardExceptionName, names, model);
        }

        if (call is not InvocationExpressionSyntax invocation)
        {
            return false;
        }

        var receiver = DeclaredTypeReceiverClassifier.ReceiverOf(invocation, out var name);
        if ((name ?? invocation.Expression as SimpleNameSyntax)?.Identifier.ValueText != "ForwardReply")
        {
            return false;
        }

        if (model is not null && model.SyntaxTree == invocation.SyntaxTree)
        {
            var info = model.GetSymbolInfo(invocation);
            var methods = (info.Symbol is { } bound ? [bound] : info.CandidateSymbols).OfType<IMethodSymbol>().ToList();
            if (methods.Count > 0)
            {
                return methods.All(static method => IsAltinnType(method.ContainingType, ForwarderName));
            }
        }

        return receiver is null ? false : IsOfAltinnType(receiver, ForwarderName, names, model);
    }

    /// <summary>
    /// Whether a property pattern's <c>MailboxId</c> is the forward exception's: by the property the semantic model
    /// binds it to, otherwise by the type the pattern names or the type of what it matches. <c>null</c> when the
    /// upgrade cannot tell.
    /// </summary>
    private static bool? MatchesForwardException(SubpatternSyntax subpattern, TypeNames names, SemanticModel? model)
    {
        if (subpattern is not { NameColon.Name: var name, Parent.Parent: RecursivePatternSyntax pattern })
        {
            return null;
        }

        if (
            model is not null
            && model.SyntaxTree == subpattern.SyntaxTree
            && model.GetSymbolInfo(name).Symbol is IPropertySymbol property
        )
        {
            return IsAltinnType(property.ContainingType, ForwardExceptionName);
        }

        if (pattern.Type is { } type)
        {
            return NamesAltinnType(type, ForwardExceptionName, names, model);
        }

        return PatternInput(pattern) is { } input ? IsOfAltinnType(input, ForwardExceptionName, names, model) : null;
    }

    /// <summary>
    /// What a pattern matches: the operand of <c>is</c>, or what a <c>switch</c> switches on, through <c>and</c>,
    /// <c>or</c>, <c>not</c> and parentheses.
    /// </summary>
    private static ExpressionSyntax? PatternInput(PatternSyntax pattern)
    {
        SyntaxNode node = pattern;
        while (node.Parent is BinaryPatternSyntax or UnaryPatternSyntax or ParenthesizedPatternSyntax)
        {
            node = node.Parent;
        }

        return node.Parent switch
        {
            IsPatternExpressionSyntax match => match.Expression,
            SwitchExpressionArmSyntax { Parent: SwitchExpressionSyntax switchExpression } =>
                switchExpression.GoverningExpression,
            CasePatternSwitchLabelSyntax { Parent.Parent: SwitchStatementSyntax switchStatement } =>
                switchStatement.Expression,
            _ => null,
        };
    }

    /// <summary>
    /// Whether the expression is of the Altinn type <paramref name="typeName"/>: by its type when the semantic model
    /// resolves it, and otherwise by the type its name is declared with. <c>this</c> and <c>base</c> are the app's
    /// own. <c>null</c> when the upgrade cannot tell, as for what a call returns or a name declared with <c>var</c>.
    /// </summary>
    private static bool? IsOfAltinnType(
        ExpressionSyntax expression,
        string typeName,
        TypeNames names,
        SemanticModel? model
    )
    {
        if (
            model is not null
            && model.SyntaxTree == expression.SyntaxTree
            && model.GetTypeInfo(expression).Type is { TypeKind: not TypeKind.Error } type
        )
        {
            return IsAltinnType(type, typeName);
        }

        IdentifierNameSyntax name;
        switch (Unwrap(expression))
        {
            case ThisExpressionSyntax or BaseExpressionSyntax:
                return false;
            case IdentifierNameSyntax identifier:
                name = identifier;
                break;
            case MemberAccessExpressionSyntax
            {
                Expression: ThisExpressionSyntax,
                Name: IdentifierNameSyntax identifier
            }:
                name = identifier;
                break;
            default:
                return null;
        }

        if (DeclaredTypes(name) is not { } declared || declared.Any(static type => type is null || type.IsVar))
        {
            return null;
        }

        var altinn = declared
            .OfType<TypeSyntax>()
            .Select(type => NamesAltinnType(Unnullable(type), typeName, names, model: null))
            .Distinct()
            .ToList();
        return altinn is [var single] ? single : null;
    }

    private static bool IsAltinnType(ITypeSymbol? type, string typeName) =>
        type is INamedTypeSymbol named
        && named.Name == typeName
        && CSharpSemanticQueries.IsAltinnAppSymbol(named)
        && named.ContainingNamespace.ToDisplayString() == BuilderNamespace;

    private static TypeSyntax Unnullable(TypeSyntax type) =>
        type is NullableTypeSyntax nullable ? nullable.ElementType : type;

    /// <summary>
    /// The types the nearest declarations of the name give it, each <c>null</c> where it is declared without one: the
    /// parameters, locals, catch clauses and patterns of the innermost function or block that declares it, or else
    /// the fields, properties and primary constructor parameters of its type. <c>null</c> when nothing declares it.
    /// </summary>
    private static List<TypeSyntax?>? DeclaredTypes(IdentifierNameSyntax name)
    {
        var identifier = name.Identifier.ValueText;
        foreach (var scope in name.Ancestors())
        {
            var candidates = scope is TypeDeclarationSyntax type
                ? type
                    .Members.SelectMany(static member =>
                        member switch
                        {
                            BaseFieldDeclarationSyntax field => field.Declaration.Variables,
                            PropertyDeclarationSyntax property => (IEnumerable<SyntaxNode>)[property],
                            _ => [],
                        }
                    )
                    .Concat(type.ParameterList?.Parameters ?? [])
                : scope.DescendantNodes();
            var declared = candidates
                .Select(node => DeclaredBy(node, identifier))
                .Where(static declaration => declaration.Declares)
                .Select(static declaration => declaration.Type)
                .ToList();
            if (declared.Count > 0)
            {
                return declared;
            }

            if (scope is TypeDeclarationSyntax)
            {
                return null;
            }
        }

        return null;
    }

    /// <summary>
    /// Whether the node declares <paramref name="name"/>, and the type it gives it.
    /// </summary>
    private static (bool Declares, TypeSyntax? Type) DeclaredBy(SyntaxNode node, string name) =>
        node switch
        {
            ParameterSyntax parameter when parameter.Identifier.ValueText == name => (true, parameter.Type),
            VariableDeclaratorSyntax { Parent: VariableDeclarationSyntax declaration } variable
                when variable.Identifier.ValueText == name => (true, declaration.Type),
            CatchDeclarationSyntax declaration when declaration.Identifier.ValueText == name => (
                true,
                declaration.Type
            ),
            ForEachStatementSyntax loop when loop.Identifier.ValueText == name => (true, loop.Type),
            PropertyDeclarationSyntax property when property.Identifier.ValueText == name => (true, property.Type),
            SingleVariableDesignationSyntax designation when designation.Identifier.ValueText == name => (
                true,
                designation.Parent switch
                {
                    DeclarationPatternSyntax pattern => pattern.Type,
                    RecursivePatternSyntax pattern => pattern.Type,
                    DeclarationExpressionSyntax declaration => declaration.Type,
                    _ => null,
                }
            ),
            _ => (false, null),
        };

    /// <summary>
    /// Whether the call's result is held or used as <paramref name="typeName"/>, the type the previews' member
    /// returned: by the type the semantic model converts it to, and otherwise when it initializes or is assigned to a
    /// <c>var</c> local or one of that type, is read from, infers <c>FromResult</c>'s type argument, or is returned
    /// from a method that names the type in its return type.
    /// </summary>
    private static bool IsHeldAs(InvocationExpressionSyntax call, string typeName, SemanticModel? model)
    {
        ExpressionSyntax direct = call;
        while (direct.Parent is ParenthesizedExpressionSyntax parenthesized)
        {
            direct = parenthesized;
        }

        // What the value goes into, through parentheses and the branches of a conditional or switch.
        ExpressionSyntax value = direct;
        while (
            value.Parent switch
            {
                ParenthesizedExpressionSyntax parenthesized => (ExpressionSyntax)parenthesized,
                ConditionalExpressionSyntax conditional when conditional.Condition != value => conditional,
                SwitchExpressionArmSyntax { Parent: SwitchExpressionSyntax switchExpression } arm
                    when arm.Expression == value => switchExpression,
                _ => null,
            }
                is { } outer
        )
        {
            value = outer;
        }

        if (
            model is not null
            && model.SyntaxTree == call.SyntaxTree
            && model.GetTypeInfo(value).ConvertedType is { TypeKind: not TypeKind.Error } converted
        )
        {
            return IsAltinnType(converted, typeName);
        }

        bool Names(TypeSyntax? type) =>
            type is null
            || type.IsVar
            || type.DescendantNodesAndSelf()
                .OfType<IdentifierNameSyntax>()
                .Any(n => n.Identifier.ValueText == typeName);

        return value.Parent switch
        {
            MemberAccessExpressionSyntax access => access.Expression == value,
            ConditionalAccessExpressionSyntax access => access.Expression == value,
            EqualsValueClauseSyntax
            {
                Parent: VariableDeclaratorSyntax { Parent: VariableDeclarationSyntax declaration }
            } => Names(declaration.Type),
            EqualsValueClauseSyntax { Parent: PropertyDeclarationSyntax property } => Names(property.Type),
            AssignmentExpressionSyntax { Left: IdentifierNameSyntax target } assignment
                when assignment.Right == value => DeclaredTypes(target)?.Any(Names) == true,
            ArgumentSyntax
            {
                Parent.Parent: InvocationExpressionSyntax
                {
                    Expression: MemberAccessExpressionSyntax
                    {
                        Name: IdentifierNameSyntax { Identifier.ValueText: "FromResult" }
                    },
                },
            } => value == direct,
            ReturnStatementSyntax or ArrowExpressionClauseSyntax => OwningFunction(value) switch
            {
                MethodDeclarationSyntax method => Names(method.ReturnType),
                LocalFunctionStatementSyntax local => Names(local.ReturnType),
                _ => false,
            },
            _ => false,
        };
    }

    /// <summary>
    /// Doc comment references to the previews' API that the current one lacks become code spans: a builder method
    /// in the current vocabulary, as <c>&lt;see cref="PipelineBuilder.Finally"/&gt;</c> becomes
    /// <c>&lt;c&gt;Stage&lt;/c&gt;</c>, and a removed type as it is written.
    /// </summary>
    private void RewriteDocReferences(ScannedCSharpFile file, TypeNames names, List<UpgradeMessage> messages)
    {
        var replacements = new Dictionary<XmlNodeSyntax, XmlNodeSyntax>();
        var crefs = file
            .Root.DescendantNodes(static node => !node.HasAnnotation(_leftAsItIs), descendIntoTrivia: true)
            .OfType<XmlCrefAttributeSyntax>();
        foreach (var attribute in crefs)
        {
            var text = attribute.Cref switch
            {
                QualifiedCrefSyntax
                {
                    Container: var container,
                    Member: NameMemberCrefSyntax { Name: SimpleNameSyntax member }
                }
                    when _previewMethods.TryGetValue(member.Identifier.ValueText, out var name)
                        && IsBuilderContainer(container, file.SemanticModel) => name,
                var cref
                    when cref.DescendantNodesAndSelf()
                        .OfType<IdentifierNameSyntax>()
                        .Any(identifier =>
                            _removedTypes.ContainsKey(identifier.Identifier.ValueText)
                            && names.IsAltinn(identifier, file.SemanticModel)
                        ) => cref.ToString(),
                _ => null,
            };
            if (text is null)
            {
                continue;
            }

            switch (attribute.Parent)
            {
                case XmlEmptyElementSyntax { Name.LocalName.ValueText: "see" or "seealso" } element:
                    replacements[element] = CodeSpan([SyntaxFactory.XmlText(text)]).WithTriviaFrom(element);
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
            $"{file.RelativePath}: doc comments name the previews' pipeline API, which the current one does not have, "
                + "in code spans instead of references, with Finally as Stage and HandleReplies and ConcludeOnReplies "
                + "as ExternalStage."
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

    /// <summary>
    /// Reports what still names the previews' API with its file and line: a removed type, code disabled by a
    /// directive that names one, and a <c>MailboxId</c> read or a <c>mailboxId:</c> passed where the upgrade cannot
    /// tell whether it is the forward exception's or the reply forwarder's. A method reported as a whole is skipped,
    /// since its to-do covers it.
    /// </summary>
    private static void ReportLeftovers(ScannedCSharpFile file, TypeNames names, List<UpgradeMessage> messages)
    {
        var found = new SortedSet<(int Line, string Name)>();
        bool Visible(SyntaxNode node) => !node.HasAnnotation(_leftAsItIs);
        var identifiers = file.Root.DescendantNodes(Visible).OfType<IdentifierNameSyntax>().ToList();
        foreach (var identifier in identifiers)
        {
            var name = identifier.Identifier.ValueText;
            if (
                _removedTypes.ContainsKey(name)
                && IsTypeReference(identifier)
                && names.IsAltinn(identifier, file.SemanticModel)
            )
            {
                found.Add((file.GetLine(identifier), name));
            }
        }

        foreach (
            var disabled in file
                .Root.DescendantTrivia(Visible)
                .Where(static t => t.IsKind(SyntaxKind.DisabledTextTrivia))
        )
        {
            foreach (Match match in RemovedTypeName().Matches(disabled.ToString()))
            {
                var line = disabled.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                found.Add((line + disabled.ToString()[..match.Index].Count(static c => c == '\n'), match.Value));
            }
        }

        foreach (var (line, name) in found)
        {
            messages.Todo($"{file.RelativePath}:{line}: {name} was removed. {_removedTypes[name]}.");
        }

        var model = file.SemanticModel;
        var nodes = file.Root.DescendantNodes(Visible).ToList();
        var uncertain = new SortedSet<(int Line, string Todo)>();
        if (identifiers.Any(static identifier => identifier.Identifier.ValueText == ForwardExceptionName))
        {
            foreach (var node in nodes)
            {
                var readsMailboxId = node switch
                {
                    MemberAccessExpressionSyntax { Name.Identifier.ValueText: "MailboxId" } access => IsOfAltinnType(
                        access.Expression,
                        ForwardExceptionName,
                        names,
                        model
                    ),
                    SubpatternSyntax { NameColon.Name.Identifier.ValueText: "MailboxId" } subpattern =>
                        MatchesForwardException(subpattern, names, model),
                    _ => false,
                };
                if (readsMailboxId != false)
                {
                    uncertain.Add(
                        (
                            file.GetLine(node),
                            $"if this reads {ForwardExceptionName}.MailboxId, it is ReplyAddressId now."
                        )
                    );
                }
            }
        }

        if (identifiers.Any(static identifier => identifier.Identifier.ValueText == ForwarderName))
        {
            foreach (var argument in nodes.OfType<ArgumentSyntax>())
            {
                if (
                    argument is { NameColon.Name.Identifier.ValueText: "mailboxId", Parent.Parent: { } call }
                    && TakesReplyAddressId(call, names, model) != false
                )
                {
                    uncertain.Add(
                        (
                            file.GetLine(argument),
                            $"if this calls {ForwarderName}.ForwardReply, its mailboxId: is replyAddressId: now."
                        )
                    );
                }
            }
        }

        foreach (var (line, todo) in uncertain)
        {
            messages.Todo($"{file.RelativePath}:{line}: {todo}");
        }
    }

    /// <summary>
    /// A type the current API removed, in code a directive disables.
    /// </summary>
    [GeneratedRegex(
        @"\b(?:MailboxHandle|MailboxOptions|MailboxClosedReason|StageExchangeResult|ServiceTaskExchangeResult|ServiceTaskOpeningStageResult|ServiceTaskPipeline|ProcessTaskPipeline)\b",
        RegexOptions.CultureInvariant
    )]
    private static partial Regex RemovedTypeName();
}
