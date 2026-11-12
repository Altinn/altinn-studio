using System.Text.Json.Serialization;
using Altinn.App.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.App.SourceGenerator.Tests.SourceReaderTests;

public class InheritedPropertyTests
{
    [Fact]
    public void CreateRootSymbolNode_ListsOwnPropertiesBeforeInheritedOnes()
    {
        var source = """
            public class Grandparent
            {
                public string FromGrandparent { get; set; }
            }

            public class Parent : Grandparent
            {
                public string FromParent { get; set; }
            }

            public class TestClass : Parent
            {
                public string Own { get; set; }
            }
            """;

        Assert.Equal(["Own: string", "FromParent: string", "FromGrandparent: string"], DescribeProperties(source));
    }

    [Fact]
    public void CreateRootSymbolNode_AppliesTheSkipRulesToInheritedProperties()
    {
        var source = """
            using System.Text.Json.Serialization;

            public class Parent
            {
                public string Kept { get; set; }

                public string ReadOnly => Kept;

                [JsonIgnore]
                public string Ignored { get; set; }

                protected string Protected { get; set; }
            }

            public class TestClass : Parent { }
            """;

        Assert.Equal(["Kept: string"], DescribeProperties(source));
    }

    [Fact]
    public void CreateRootSymbolNode_ListsRedeclaredAndOverriddenPropertiesOnce()
    {
        var source = """
            using System.Text.Json.Serialization;

            public class Parent
            {
                [JsonPropertyName("redeclaredInParent")]
                public string Redeclared { get; set; }

                [JsonPropertyName("overriddenInParent")]
                public virtual string Overridden { get; set; }

                public string Inherited { get; set; }
            }

            public class TestClass : Parent
            {
                [JsonPropertyName("redeclared")]
                public new int Redeclared { get; set; }

                [JsonPropertyName("overridden")]
                public override string Overridden { get; set; }
            }
            """;

        Assert.Equivalent(
            new[] { "redeclared: int", "overridden: string", "Inherited: string" },
            DescribeProperties(source),
            strict: true
        );
    }

    [Fact]
    public void CreateRootSymbolNode_ReadsGenericBaseClassPropertiesWithTheTypeArguments()
    {
        var source = """
            using System.Collections.Generic;

            public class Item { }

            public class Parent<T>
            {
                public List<T> Items { get; set; }
            }

            public class TestClass : Parent<Item> { }
            """;

        Assert.Equal(["Items: global::System.Collections.Generic.List<global::Item>"], DescribeProperties(source));
    }

    [Fact]
    public void CreateRootSymbolNode_StopsAtBaseClassesInSystem()
    {
        var source = """
            using System.Collections.Generic;

            public class Parent : List<string>
            {
                public string FromParent { get; set; }
            }

            public class TestClass : Parent { }
            """;

        Assert.Equal(["FromParent: string"], DescribeProperties(source));
    }

    [Fact]
    public void CreateRootSymbolNode_SkipsInternalPropertiesOfAnotherAssembly()
    {
        var library = CreateCompilation(
            "Library",
            """
            public class Parent
            {
                public string Public { get; set; }

                internal string InternalToLibrary { get; set; }
            }
            """
        );
        var source = """
            public class TestClass : Parent
            {
                internal string InternalToApp { get; set; }
            }
            """;

        Assert.Equivalent(
            new[] { "InternalToApp: string", "Public: string" },
            DescribeProperties(source, library.ToMetadataReference()),
            strict: true
        );
    }

    private static string[] DescribeProperties(string source, params MetadataReference[] references)
    {
        var compilation = CreateCompilation("App", source, references);
        var rootNode = FormDataWrapperUtils.CreateRootSymbolNode("TestClass", compilation, []);

        Assert.NotNull(rootNode);
        return rootNode
            .Properties.Select(property => $"{property.JsonName}: {property.ListType ?? property.TypeName}")
            .ToArray();
    }

    private static CSharpCompilation CreateCompilation(
        string assemblyName,
        string source,
        params MetadataReference[] references
    )
    {
        var platformReferences = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location))
            .Append(MetadataReference.CreateFromFile(typeof(JsonIgnoreAttribute).Assembly.Location));

        return CSharpCompilation.Create(
            assemblyName,
            [CSharpSyntaxTree.ParseText(source)],
            [.. platformReferences, .. references],
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
    }
}
