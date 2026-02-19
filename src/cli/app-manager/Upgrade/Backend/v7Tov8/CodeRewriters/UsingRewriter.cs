using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.CodeRewriters;

/// <summary>
/// Rewrite the usings of moved interfaces
/// </summary>
internal sealed class UsingRewriter : CSharpSyntaxRewriter
{
    private const string CommonInterfaceNamespace = "Altinn.App.Core.Interface";

    private readonly Dictionary<string, string> _usingMappings = new Dictionary<string, string>()
    {
        { "IAppEvents", "Altinn.App.Core.Internal.App" },
        { "IApplication", "Altinn.App.Core.Internal.App" },
        { "IAppResources", "Altinn.App.Core.Internal.App" },
        { "IAuthenticationClient", "Altinn.App.Core.Internal.Auth" },
        { "IAuthorizationClient", "Altinn.App.Core.Internal.Auth" },
        { "IDataClient", "Altinn.App.Core.Internal.Data" },
        { "IPersonClient", "Altinn.App.Core.Internal.Registers" },
        { "IOrganizationClient", "Altinn.App.Core.Internal.Registers" },
        { "IEventsClient", "Altinn.App.Core.Internal.Events" },
        { "IInstanceClient", "Altinn.App.Core.Internal.Instances" },
        { "IInstanceEventClient", "Altinn.App.Core.Internal.Instances" },
        { "IPrefill", "Altinn.App.Core.Internal.Prefill" },
        { "IProcessClient", "Altinn.App.Core.Internal.Process" },
        { "IProfileClient", "Altinn.App.Core.Internal.Profile" },
        { "IAltinnPartyClient", "Altinn.App.Core.Internal.Registers" },
        { "ISecretsClient", "Altinn.App.Core.Internal.Secrets" },
        { "ITaskEvents", "Altinn.App.Core.Internal.Process" },
        { "IUserTokenProvider", "Altinn.App.Core.Internal.Auth" },
    };

    /// <inheritdoc/>
    public override SyntaxNode? VisitCompilationUnit(CompilationUnitSyntax node)
    {
        foreach (var mapping in _usingMappings)
        {
            if (HasFieldOfType(node, mapping.Key))
            {
                node = AddUsing(node, mapping.Value);
            }
        }

        if (ImplementsIProcessExclusiveGateway(node))
        {
            node = AddUsing(node, "Altinn.App.Core.Models.Process");
        }

        return RemoveOldUsing(node);
    }

    private bool HasFieldOfType(CompilationUnitSyntax node, string typeName)
    {
        var fieldDecendants = node.DescendantNodes().OfType<FieldDeclarationSyntax>();
        return fieldDecendants.Any(f => f.Declaration.Type.ToString() == typeName);
    }

    private bool ImplementsIProcessExclusiveGateway(CompilationUnitSyntax node)
    {
        var classDecendants = node.DescendantNodes().OfType<ClassDeclarationSyntax>();
        return classDecendants.Any(c =>
            c.BaseList?.Types.Any(t => t.Type.ToString() == "IProcessExclusiveGateway") == true
        );
    }

    private CompilationUnitSyntax AddUsing(CompilationUnitSyntax node, string usingString)
    {
        if (HasUsingDefined(node, usingString))
        {
            return node;
        }
        var usingName = SyntaxFactory.ParseName(usingString);
        var usingDirective = SyntaxFactory
            .UsingDirective(usingName)
            .NormalizeWhitespace()
            .WithTrailingTrivia(SyntaxFactory.ElasticCarriageReturnLineFeed);
        return node.AddUsings(usingDirective);
    }

    private bool HasUsingDefined(CompilationUnitSyntax node, string usingName)
    {
        var usingDirectiveSyntaxes = node.DescendantNodes().OfType<UsingDirectiveSyntax>();
        return usingDirectiveSyntaxes.Any(u => u.Name?.ToString() == usingName);
    }

    private CompilationUnitSyntax? RemoveOldUsing(CompilationUnitSyntax node)
    {
        var usingDirectiveSyntaxes = node.DescendantNodes().OfType<UsingDirectiveSyntax>();
        var usingDirectiveSyntax = usingDirectiveSyntaxes.FirstOrDefault(u =>
            u.Name?.ToString() == CommonInterfaceNamespace
        );
        if (usingDirectiveSyntax is not null)
        {
            return node.RemoveNode(usingDirectiveSyntax, SyntaxRemoveOptions.KeepNoTrivia);
        }
        return node;
    }
}
