using Altinn.App.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.App.SourceGenerator.Tests.SourceReaderTests;

public class CollectionTypeTests
{
    [Theory]
    [InlineData("ListValue", true)]
    [InlineData("CustomListValue", true)]
    [InlineData("HashSetValue", false)]
    [InlineData("CustomHashSetValue", false)]
    public void CreateRootSymbolNode_DetectsIndexableCollections(string propertyName, bool expectedIndexable)
    {
        var source = """
            using System.Collections.Generic;

            public class CustomList<T> : List<T>;

            public class CustomHashSet<T> : HashSet<T>;

            public class TestClass
            {
                public List<string>? ListValue { get; set; }
                public CustomList<string>? CustomListValue { get; set; }
                public HashSet<string>? HashSetValue { get; set; }
                public CustomHashSet<string>? CustomHashSetValue { get; set; }
            }
            """;

        var compilation = CreateCompilation(source);
        var rootNode = FormDataWrapperUtils.CreateRootSymbolNode("TestClass", compilation, []);

        var property = Assert.Single(rootNode?.Properties ?? [], p => p.CSharpName == propertyName);

        Assert.NotNull(property.ListType);
        Assert.Equal(expectedIndexable, property.IsIndexableList);
    }

    private static Compilation CreateCompilation(string source)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(source);

        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location));

        return CSharpCompilation.Create(
            "TestAssembly",
            [syntaxTree],
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
    }
}
