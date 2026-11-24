using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

internal sealed partial class PreviewPipelineMigration
{
    private const string ForwardExceptionName = "ServiceTaskReplyForwardException";

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
    /// The previews' members that were renamed: the type, the member, and its name now.
    /// </summary>
    private static readonly (string Type, string Member, string Renamed)[] _memberRenames =
    [
        ("ServiceTaskResult", "Success", "EndTask"),
        ("ServiceTaskReplyForwardOutcome", "MailboxFull", "TooManyReplies"),
        (ForwardExceptionName, "MailboxId", "ReplyAddressId"),
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
    /// Makes the renames that mean the same wherever they stand, and reports them per file.
    /// </summary>
    private void RenameEverywhere(ScannedCSharpFile file, TypeNames names, List<UpgradeMessage> messages)
    {
        var rewriter = new RenameRewriter(names, file.SemanticModel);
        var renamed = MethodRewriter.Kept(rewriter.Visit(file.Root), file.Root);
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
            foreach (var (type, from, to) in _memberRenames)
            {
                if (
                    member == from
                    && (
                        type == ForwardExceptionName
                            ? IsForwardException(node.Expression)
                            : NamesAltinnType(node.Expression, type, names, model)
                    )
                )
                {
                    return Rename(visited, type, from, to);
                }
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

            foreach (var (type, from, to) in _memberRenames)
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
                && node.Parent?.Parent switch
                {
                    InvocationExpressionSyntax call => call.Expression switch
                    {
                        MemberAccessExpressionSyntax access => access.Name.Identifier.ValueText,
                        SimpleNameSyntax name => name.Identifier.ValueText,
                        _ => null,
                    } == "ForwardReply",
                    ObjectCreationExpressionSyntax creation => SimpleName(creation.Type) == ForwardExceptionName,
                    _ => false,
                }
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
                && node.Parent?.Parent is RecursivePatternSyntax { Type: { } type }
                && SimpleName(type) == ForwardExceptionName
            )
            {
                Renamed.Add($"{ForwardExceptionName}.MailboxId is ReplyAddressId");
                return visited.WithNameColon(
                    nameColon.WithName(SyntaxFactory.IdentifierName("ReplyAddressId").WithTriviaFrom(nameColon.Name))
                );
            }

            return visited;
        }

        private MemberAccessExpressionSyntax Rename(
            MemberAccessExpressionSyntax access,
            string type,
            string from,
            string to
        )
        {
            Renamed.Add($"{type}.{from} is {to}");
            return access.WithName(SyntaxFactory.IdentifierName(to).WithTriviaFrom(access.Name));
        }

        /// <summary>
        /// Whether the expression is a <c>ServiceTaskReplyForwardException</c>: by its type when the semantic model
        /// resolves it, and otherwise a name declared with that type in the member, such as a catch clause's.
        /// </summary>
        private bool IsForwardException(ExpressionSyntax expression)
        {
            if (
                model is not null
                && model.SyntaxTree == expression.SyntaxTree
                && model.GetTypeInfo(expression).Type is { TypeKind: not TypeKind.Error } type
            )
            {
                return type.Name == ForwardExceptionName && CSharpSemanticQueries.IsAltinnAppSymbol(type);
            }

            return expression is IdentifierNameSyntax name && DeclaredAsForwardException(name);
        }
    }

    /// <summary>
    /// Whether the member declares the name with the type <c>ServiceTaskReplyForwardException</c>: a catch clause, a
    /// parameter, a local or a pattern.
    /// </summary>
    private static bool DeclaredAsForwardException(IdentifierNameSyntax name) =>
        name.FirstAncestorOrSelf<MemberDeclarationSyntax>() is { } member
        && member
            .DescendantNodes()
            .Any(node =>
                node switch
                {
                    CatchDeclarationSyntax catchDeclaration => catchDeclaration.Identifier.ValueText
                        == name.Identifier.ValueText
                        && SimpleName(catchDeclaration.Type) == ForwardExceptionName,
                    ParameterSyntax parameter => parameter.Identifier.ValueText == name.Identifier.ValueText
                        && SimpleName(parameter.Type) == ForwardExceptionName,
                    VariableDeclaratorSyntax { Parent: VariableDeclarationSyntax declaration } variable => variable
                        .Identifier
                        .ValueText == name.Identifier.ValueText
                        && SimpleName(declaration.Type) == ForwardExceptionName,
                    SingleVariableDesignationSyntax designation => designation.Identifier.ValueText
                        == name.Identifier.ValueText
                        && designation.Parent switch
                        {
                            DeclarationPatternSyntax pattern => SimpleName(pattern.Type) == ForwardExceptionName,
                            RecursivePatternSyntax { Type: { } type } => SimpleName(type) == ForwardExceptionName,
                            DeclarationExpressionSyntax declaration => SimpleName(declaration.Type)
                                == ForwardExceptionName,
                            _ => false,
                        },
                    _ => false,
                }
            );

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
    /// Reports what still names the previews' API with its file and line: a removed type, a
    /// <c>ServiceTaskReplyForwardException.MailboxId</c> read where the upgrade cannot tell the exception apart, and
    /// code disabled by a directive that names a removed type. A method reported as a whole is skipped, since its
    /// to-do covers it.
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

        if (!identifiers.Any(static identifier => identifier.Identifier.ValueText == ForwardExceptionName))
        {
            return;
        }

        foreach (
            var access in file
                .Root.DescendantNodes(Visible)
                .OfType<MemberAccessExpressionSyntax>()
                .Where(static access => access.Name.Identifier.ValueText == "MailboxId")
        )
        {
            if (
                file.SemanticModel is { } model
                && model.GetTypeInfo(access.Expression).Type is { TypeKind: not TypeKind.Error } type
                && type.Name != ForwardExceptionName
            )
            {
                continue;
            }

            messages.Todo(
                $"{file.RelativePath}:{file.GetLine(access)}: if this reads {ForwardExceptionName}.MailboxId, it is "
                    + "ReplyAddressId now."
            );
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
