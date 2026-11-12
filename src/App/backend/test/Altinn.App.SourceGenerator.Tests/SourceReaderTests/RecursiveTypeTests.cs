using Altinn.App.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.App.SourceGenerator.Tests.SourceReaderTests;

public class RecursiveTypeTests
{
    [Theory]
    [InlineData("public class TestClass { public TestClass Next { get; set; } }")]
    [InlineData("public class Parent { public TestClass Child { get; set; } } public class TestClass : Parent { }")]
    public void CreateRootSymbolNode_ThrowsForATypeThatContainsItself(string source)
    {
        var exception = Assert.Throws<NotSupportedException>(() => CreateRootSymbolNode(source));

        Assert.Contains("global::TestClass", exception.Message);
    }

    [Fact]
    public void CreateRootSymbolNode_ReadsATypeUsedOnSeparatePaths()
    {
        var source = """
            public class Address
            {
                public string Street { get; set; }
            }

            public class TestClass
            {
                public Address Home { get; set; }

                public Address Work { get; set; }
            }
            """;

        var rootNode = CreateRootSymbolNode(source);

        Assert.Equal(["Home", "Work"], rootNode?.Properties.Select(property => property.CSharpName));
    }

    private static ModelPathNode? CreateRootSymbolNode(string source)
    {
        var compilation = CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(source)],
            [MetadataReference.CreateFromFile(typeof(object).Assembly.Location)],
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        return FormDataWrapperUtils.CreateRootSymbolNode("TestClass", compilation, []);
    }
}
