using System.Xml.Serialization;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.CodeRewriters;

/// <summary>
/// Rewrites the Model classes to include Guid AltinnRowId
/// </summary>
public class ModelRewriter : CSharpSyntaxRewriter
{
    private readonly List<string> _modelsInList;

    public ModelRewriter(List<string> modelsInList)
    {
        _modelsInList = modelsInList;
    }
    /// <inheritdoc/>
    public override SyntaxNode? VisitClassDeclaration(ClassDeclarationSyntax node)
    {
        if (_modelsInList.Contains(node.Identifier.Text) && !node.Members.Any(m => m is PropertyDeclarationSyntax p && p.Identifier.Text == "AltinnRowId"))
        {
            var altinnRowIdProperty = SyntaxFactory.ParseMemberDeclaration("""
                [XmlAttribute("altinnRowId")]
                [JsonPropertyName("altinnRowId")]
                [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
                public Guid AltinnRowId { get; set; }
            """)!.WithTrailingTrivia(SyntaxFactory.LineFeed, SyntaxFactory.LineFeed);

            var altinnRowIdShouldSerialize = SyntaxFactory.ParseMemberDeclaration("""
                public bool ShouldSerializeAltinnRowId()
                {
                    return AltinnRowId != default;
                }
            """)!.WithTrailingTrivia(SyntaxFactory.LineFeed, SyntaxFactory.LineFeed);


            node = node.WithMembers(node.Members.InsertRange(0, [altinnRowIdProperty, altinnRowIdShouldSerialize]));
        }

        return base.VisitClassDeclaration(node);
    }
}
