using System.Collections.Immutable;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.Analyzers.Tests;

public class AsyncVoidAnalyzerTests
{
    private const string Usings = """
        using System;
        using System.Collections.Generic;
        using System.Threading.Tasks;

        """;

    [Fact]
    public async Task Reports_Async_Void_Methods_Local_Functions_And_Lambdas()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class Handlers
                {
                    public async void Fire() => await Task.Delay(1);

                    public void Run(List<int> items)
                    {
                        async void Local() => await Task.Delay(1);
                        Local();

                        items.ForEach(async item => await Task.Delay(item));
                        Action action = async () => await Task.Delay(1);
                        Action<int> anonymous = async delegate (int x) { await Task.Delay(x); };
                    }
                }
                """
        );

        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.CodeSmells.AsyncVoid.Id, d.Id));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Allows_Async_Task_And_Event_Handlers()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class CustomEventArgs : EventArgs { }

                public sealed class Handlers
                {
                    public event EventHandler<CustomEventArgs>? Changed;

                    public async Task Fire() => await Task.Delay(1);

                    public async ValueTask<int> Count() => await Task.FromResult(1);

                    public void NotAsync() { }

                    public async void OnClick(object sender, EventArgs e) => await Task.Delay(1);

                    public void Run()
                    {
                        Changed += async (sender, e) => await Task.Delay(1);
                        Func<Task> func = async () => await Task.Delay(1);
                        _ = Task.Run(async () => await Task.Delay(1));

                        async Task Local() => await Task.Delay(1);
                        _ = Local();
                    }
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Projects_That_Are_Not_Apps_Are_Not_Analyzed()
    {
        var diagnostics = await Analyze(
            Usings + "public sealed class Handlers { public async void Fire() => await Task.Delay(1); }",
            isAltinnApp: false
        );

        Assert.Empty(diagnostics);
    }

    private static async Task<ImmutableArray<Diagnostic>> Analyze(string source, bool isAltinnApp = true)
    {
        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location));

        var compilation = CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(source, path: "/repo/App/Handlers.cs")],
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        var options = new AnalyzerOptions([], new AltinnAppOptionsProvider(isAltinnApp));
        return await compilation
            .WithAnalyzers([new AsyncVoidAnalyzer()], options)
            .GetAnalyzerDiagnosticsAsync(CancellationToken.None);
    }
}
