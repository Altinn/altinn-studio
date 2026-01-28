using System.Text.Json.Serialization;
using Altinn.App.Analyzers.SourceTextGenerator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.App.SourceGenerator.Tests.SourceReaderTests;

public class JsonIgnoreAttributeTests
{
    [Theory]
    [InlineData("[JsonIgnore]", true)]
    [InlineData("[JsonIgnore()]", true)]
    [InlineData("[JsonIgnore(Condition = JsonIgnoreCondition.Always)]", true)]
    [InlineData("[JsonIgnore(Condition = JsonIgnoreCondition.Never)]", false)]
    [InlineData("[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]", false)]
    [InlineData("[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]", false)]
    public void HasJsonIgnoreAttribute_ShouldBeIgnored(string attribute, bool ignored)
    {
        var source = $$"""
            using System.Text.Json.Serialization;

            public class TestClass
            {
                {{attribute}}
                public string Property { get; set; }
            }
            """;
        var property = GetPropertySymbol(source, "Property");
        Assert.Equal(ignored, SourceReaderUtils.HasJsonIgnoreAttribute(property));
    }

    private static IPropertySymbol GetPropertySymbol(string source, string propertyName)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(source);

        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location))
            .Concat([MetadataReference.CreateFromFile(typeof(JsonIgnoreAttribute).Assembly.Location)]);

        var compilation = CSharpCompilation.Create(
            "TestAssembly",
            [syntaxTree],
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        var semanticModel = compilation.GetSemanticModel(syntaxTree);
        var root = syntaxTree.GetRoot();
        var propertyDeclaration = root.DescendantNodes()
            .OfType<Microsoft.CodeAnalysis.CSharp.Syntax.PropertyDeclarationSyntax>()
            .Single(p => p.Identifier.Text == propertyName);

        var propertySymbol = semanticModel.GetDeclaredSymbol(propertyDeclaration);
        Assert.NotNull(propertySymbol);

        return propertySymbol;
    }
}
