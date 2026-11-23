using Altinn.App.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.App.SourceGenerator.Tests.SourceReaderTests;

public class RecursiveTypeTests
{
    [Theory]
    [InlineData("public class TestClass { public TestClass Next { get; set; } }", "global::TestClass")]
    [InlineData(
        "public class Parent { public TestClass Child { get; set; } } public class TestClass : Parent { }",
        "global::TestClass"
    )]
    [InlineData(
        "public class Parent<T> { public Child<Child<T>> Next { get; set; } } public class Child<T> : Parent<T> { }"
            + " public class TestClass : Parent<int> { }",
        "global::Child<T>"
    )]
    public void CreateRootSymbolNode_ThrowsForATypeThatContainsItself(string source, string type)
    {
        var exception = Assert.Throws<NotSupportedException>(() => CreateRootSymbolNode(source));

        Assert.EndsWith($"Type: {type}", exception.Message);
    }

    [Fact]
    public void CreateRootSymbolNode_ReadsTypesNestedAsDeepAsSystemTextJsonReads()
    {
        // TestClass is the first of the 64 levels that JsonSerializerOptions.MaxDepth allows by default
        var wrappers = string.Concat(Enumerable.Repeat("Wrapper<", 63)) + "string" + new string('>', 63);
        var source = $$"""
            public class Wrapper<T>
            {
                public T Value { get; set; }
            }

            public class TestClass
            {
                public {{wrappers}} Value { get; set; }
            }
            """;

        Assert.NotNull(CreateRootSymbolNode(source));
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
