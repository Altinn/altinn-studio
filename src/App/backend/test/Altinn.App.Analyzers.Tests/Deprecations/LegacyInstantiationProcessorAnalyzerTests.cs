using Altinn.App.Analyzers.Deprecations;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.Analyzers.Tests.Deprecations;

public class LegacyInstantiationProcessorAnalyzerTests
{
    private const string Usings = """
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.Platform.Storage.Interface.Models;

        """;

    private const string CurrentOverload = """
            public Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) =>
                Task.CompletedTask;
        """;

    [Fact]
    public async Task Reports_Legacy_Overload_Next_To_The_Current_One()
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class Processor : IInstantiationProcessor
                {
                {{CurrentOverload}}

                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(Diagnostics.Deprecations.LegacyInstantiationProcessorDataCreation.Id, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Equal(10, diagnostic.Location.GetLineSpan().StartLinePosition.Line);
        Assert.Contains("'Processor'", diagnostic.GetMessage());
    }

    [Fact]
    public async Task Reports_Legacy_Overload_In_A_Base_Class_Of_A_Processor()
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public abstract class ProcessorBase
                {
                    public virtual Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }

                public sealed class Processor : ProcessorBase, IInstantiationProcessor
                {
                {{CurrentOverload}}

                    public override Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );

        Assert.Equal(2, diagnostics.Count);
        Assert.Contains(diagnostics, d => d.GetMessage().Contains("'ProcessorBase'"));
        Assert.Contains(diagnostics, d => d.GetMessage().Contains("'Processor'"));
    }

    [Fact]
    public async Task Allows_Legacy_Shaped_Method_The_App_Calls()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class Processor : IInstantiationProcessor
                {
                    public Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) =>
                        DataCreation(instanceDataMutator.Instance, data, prefill);

                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Allows_Current_Overload_And_Unrelated_Types()
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class Processor : IInstantiationProcessor
                {
                {{CurrentOverload}}

                    private Task DataCreation(Instance instance, object data) => Task.CompletedTask;
                }

                public sealed class NotAProcessor
                {
                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Projects_That_Are_Not_Apps_Are_Not_Analyzed()
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class Processor : IInstantiationProcessor
                {
                {{CurrentOverload}}

                    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                        Task.CompletedTask;
                }
                """,
            isAltinnApp: false
        );

        Assert.Empty(diagnostics);
    }

    private static async Task<IReadOnlyList<Diagnostic>> Analyze(string source, bool isAltinnApp = true)
    {
        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location))
            .Append(MetadataReference.CreateFromFile(typeof(Core.Features.IInstantiationProcessor).Assembly.Location))
            .Append(
                MetadataReference.CreateFromFile(typeof(Platform.Storage.Interface.Models.Instance).Assembly.Location)
            )
            .DistinctBy(reference => reference.Display);

        var compilation = CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(source, path: "/repo/App/Processor.cs")],
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        var options = new AnalyzerOptions([], new AltinnAppOptionsProvider(isAltinnApp));
        var diagnostics = await compilation
            .WithAnalyzers([new LegacyInstantiationProcessorAnalyzer()], options)
            .GetAnalyzerDiagnosticsAsync(CancellationToken.None);

        return diagnostics.OrderBy(d => d.Location.GetLineSpan().StartLinePosition).ToList();
    }
}
