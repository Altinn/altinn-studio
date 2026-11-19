using Altinn.App.Analyzers;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.App.SourceGenerator.Tests.SourceReaderTests;

public class InitialValueTests
{
    [Theory]
    [InlineData("Plain", "Number", false)]
    [InlineData("Plain", "WithInitializer", true)]
    [InlineData("Plain", "FieldBacked", true)]
    [InlineData("Plain", "NullableWithInitializer", false)]
    [InlineData("Plain", "Text", false)]
    [InlineData("WithConstructor", "Value", true)]
    [InlineData("DerivedFromConstructor", "Value", true)]
    [InlineData("DerivedFromPlain", "Value", false)]
    [InlineData("RequiredMember", "Value", false)]
    [InlineData("NoParameterlessConstructor", "Value", false)]
    public void CreateRootSymbolNode_UsesNewObjectOnlyWhenItMayGiveAnotherValue(
        string objectName,
        string propertyName,
        bool expected
    )
    {
        var source = """
            public class Plain
            {
                private int _fieldBacked = 3;

                public int Number { get; set; }
                public int WithInitializer { get; set; } = 5;
                public int FieldBacked { get => _fieldBacked; set => _fieldBacked = value; }
                public int? NullableWithInitializer { get; set; } = 5;
                public string Text { get; set; } = "text";
            }

            public class WithConstructor
            {
                public WithConstructor()
                {
                    Value = 5;
                }

                public int Value { get; set; }
            }

            public class DerivedFromConstructor : WithConstructor;

            public class DerivedFromPlain : Plain
            {
                public int Value { get; set; }
            }

            public class RequiredMember
            {
                public int Value { get; set; } = 5;
                public required string Name { get; set; }
            }

            public class NoParameterlessConstructor(int value)
            {
                public int Value { get; set; } = value;
            }

            public class Root
            {
                public Plain? Plain { get; set; }
                public WithConstructor? WithConstructor { get; set; }
                public DerivedFromConstructor? DerivedFromConstructor { get; set; }
                public DerivedFromPlain? DerivedFromPlain { get; set; }
                public RequiredMember? RequiredMember { get; set; }
                public NoParameterlessConstructor? NoParameterlessConstructor { get; set; }
            }
            """;

        var compilation = CreateCompilation(source);
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));
        var rootNode = FormDataWrapperUtils.CreateRootSymbolNode("Root", compilation, []);

        var objectNode = Assert.Single(rootNode?.Properties ?? [], p => p.CSharpName == objectName);
        var property = Assert.Single(objectNode.Properties, p => p.CSharpName == propertyName);

        Assert.Equal(expected, property.HasInitialValue);
        Assert.Equal(
            expected ? $"new {objectNode.TypeName}().{propertyName}" : "default",
            objectNode.DefaultValueOf(property)
        );
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
