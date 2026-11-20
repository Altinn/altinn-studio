using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Microsoft.CodeAnalysis;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// Whether a hook's code calls Storage, which decides that the port leaves it to the rewrite of Storage calls: calls
/// on a client anywhere in the app code the hook reaches, and calls on an <c>HttpClient</c> in the hook's own class.
/// </summary>
public sealed class StorageCallReachTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private static string Hook(string body, string members = "") =>
        $$"""
            public class Hook(IDataClient dataClient, IHelper helper, Worker worker, HttpClient http) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    {{body}}
                }

                {{members}}
            }

            public interface IHelper
            {
                Task Run(Instance instance);
            }

            public class Helper(IDataClient dataClient) : IHelper
            {
                public Task Run(Instance instance) => dataClient.GetFormData(instance, instance.Data[0]);
            }

            public abstract class Worker
            {
                public abstract Task Run(Instance instance);
            }

            public class StorageWorker(IDataClient dataClient) : Worker
            {
                public override Task Run(Instance instance) => dataClient.GetFormData(instance, instance.Data[0]);
            }

            public class Loader
            {
                public Loader(IDataClient dataClient, Instance instance) => dataClient.GetFormData(instance, instance.Data[0]);
            }

            public class Sender(HttpClient http)
            {
                public Task Send() => http.GetAsync("https://example.com/case-numbers");
            }

            public class MyDataClient : IDataClient
            {
                public Task<object> GetFormData(Instance instance, DataElement dataElement) => Task.FromResult(new object());

                public Task<DataElement> UpdateFormData(Instance instance, object data, DataElement dataElement) =>
                    Task.FromResult(dataElement);
            }

            public static class Chain
            {
            {{string.Join(
                "\n",
                Enumerable.Range(0, 14).Select(static i => $"    public static Task Step{i}() => Step{i + 1}();")
            )}}
                public static Task Step14() => Task.CompletedTask;
            }
            """;

    public static TheoryData<string, string, string, bool> Hooks =>
        new()
        {
            { "no calls", "await Task.Delay(1);", "", false },
            { "a client call in the hook", "await dataClient.GetFormData(instance, instance.Data[0]);", "", true },
            {
                "an extension method on a client",
                "await dataClient.GetFormData<object>(instance, instance.Data[0]);",
                "",
                true
            },
            {
                "a client call in a method of the hook",
                "await Read(instance);",
                "private Task Read(Instance instance) => dataClient.GetFormData(instance, instance.Data[0]);",
                true
            },
            { "a client call in a class the hook creates", "await new Helper(dataClient).Run(instance);", "", true },
            { "a client call in a constructor", "_ = new Loader(dataClient, instance);", "", true },
            { "a client call behind an app interface", "await helper.Run(instance);", "", true },
            { "a client call in an override", "await worker.Run(instance);", "", true },
            {
                "a client call in a lambda",
                "Func<Task> read = () => dataClient.GetFormData(instance, instance.Data[0]); await read();",
                "",
                true
            },
            {
                "a client call in a property",
                "await Form;",
                "private Task<object> Form => dataClient.GetFormData(new Instance(), new DataElement());",
                true
            },
            {
                "a client class of the app",
                "await new MyDataClient().GetFormData(instance, instance.Data[0]);",
                "",
                true
            },
            { "an HttpClient in the hook's class", "await http.GetAsync(\"https://example.com\");", "", true },
            { "an HttpClient in another class", "await new Sender(http).Send();", "", false },
            { "a chain of calls longer than is followed", "await Chain.Step0();", "", true },
        };

    [Theory]
    [MemberData(nameof(Hooks))]
    public void FindsStorageCallsInTheCodeAHookReaches(string label, string body, string members, bool callsStorage)
    {
        _ = label;
        _app.Write(
            "logic/Hook.cs",
            InApp(Hook(body, members))
                .Replace(
                    "using Altinn.App.Core.Features;",
                    "using System.Net.Http;\nusing Altinn.App.Core.Features;\nusing Altinn.App.Core.Internal.Data;",
                    StringComparison.Ordinal
                )
        );
        var scanner = SemanticScannerFactory.CreateScanner(AppFolder, V8);
        var compilation =
            scanner.Files[0].SemanticModel?.Compilation ?? throw new InvalidOperationException("No model.");
        var end =
            compilation.GetTypeByMetadataName("App.Logic.Hook")?.GetMembers("End").OfType<IMethodSymbol>().Single()
            ?? throw new InvalidOperationException("No hook.");

        Assert.Equal(callsStorage, new StorageCallReach(compilation).Reaches(end));
    }
}
