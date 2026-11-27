using Altinn.Studio.Fleet.Analysis.ApiUsage;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Altinn.Studio.Fleet.Tests.Analysis.ApiUsage;

public sealed class UsageWalkerTests
{
    private const string Library = """
        namespace Altinn.App.Core.Features;

        public abstract class MixedBase
        {
            protected MixedBase(params object[] values) { }

            protected MixedBase(int first = 0, int second = 0) { }
        }

        public abstract class GenericBase<T>
        {
            protected GenericBase(params T[] values) { }

            protected GenericBase(string name = "") { }
        }

        public abstract record RecordBase
        {
            protected RecordBase(params object[] values) { }

            protected RecordBase(int first = 0) { }
        }
        """;

    // The compiler takes a constructor whose parameters are all optional over one that needs its params array expanded.
    [Theory]
    [InlineData("public class Implicit : MixedBase { }")]
    [InlineData("public class Bodiless : MixedBase;")]
    [InlineData("public class Declared : MixedBase { public Declared() { } }")]
    [InlineData("public class Primary(int x) : MixedBase { public int X => x; }")]
    [InlineData("public partial class Split : MixedBase { } public partial class Split { public Split(int x) { } }")]
    public void Walk_RecordsTheBaseConstructorTheCompilerCalls(string app)
    {
        Assert.Equal(
            ["construct M:Altinn.App.Core.Features.MixedBase.#ctor(System.Int32,System.Int32)"],
            Constructions(app)
        );
    }

    [Fact]
    public void Walk_RecordsTheBaseConstructorOfAGenericBase()
    {
        Assert.Equal(
            ["construct M:Altinn.App.Core.Features.GenericBase`1.#ctor(System.String)"],
            Constructions("public class Named : GenericBase<int> { }")
        );
    }

    [Fact]
    public void Walk_RecordsTheBaseConstructorOfAPositionalRecord()
    {
        Assert.Equal(
            ["construct M:Altinn.App.Core.Features.RecordBase.#ctor(System.Int32)"],
            Constructions("public record Positional(int X) : RecordBase;")
        );
    }

    [Fact]
    public void Walk_RecordsNoBaseConstructor_WhenEveryConstructorNamesOne()
    {
        Assert.Equal(
            ["construct M:Altinn.App.Core.Features.MixedBase.#ctor(System.Object[])"],
            Constructions("public class Named : MixedBase { public Named() : base(1, 2, 3) { } }")
        );
    }

    private static List<string> Constructions(string app)
    {
        CancellationToken token = TestContext.Current.CancellationToken;
        MetadataReference[] framework =
        [
            .. AppDomain
                .CurrentDomain.GetAssemblies()
                .Where(a => !a.IsDynamic && a.Location.Length > 0)
                .Select(a => MetadataReference.CreateFromFile(a.Location)),
        ];
        var options = new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary);
        CSharpCompilation library = CSharpCompilation.Create(
            "Altinn.App.Core",
            [CSharpSyntaxTree.ParseText(Library, cancellationToken: token)],
            framework,
            options
        );
        SyntaxTree tree = CSharpSyntaxTree.ParseText(
            $"using Altinn.App.Core.Features;\n\nnamespace App;\n\n{app}",
            cancellationToken: token
        );
        CSharpCompilation compilation = CSharpCompilation.Create(
            "App",
            [tree],
            [.. framework, library.ToMetadataReference()],
            options
        );
        Assert.Empty(compilation.GetDiagnostics(token).Where(d => d.Severity == DiagnosticSeverity.Error));

        var found = new List<string>();
        new UsageWalker(
            compilation.GetSemanticModel(tree),
            (symbol, kind, _) =>
            {
                if (kind == UseKinds.Construct)
                {
                    found.Add($"{kind} {LibrarySymbols.Normalize(symbol).GetDocumentationCommentId()}");
                }
            }
        ).Visit(tree.GetRoot(token));
        return [.. found.Distinct()];
    }
}
