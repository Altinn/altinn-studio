using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// The parts of <c>Altinn.App.Core</c> the hook port binds to, in their v8 and v9 shapes. <c>Instance</c> and the
/// clients really live in other assemblies; only the assembly of the hook interfaces matters to the port, so one stub
/// holds them all. A rewrite is checked by compiling the app against the v9 stub.
/// </summary>
internal static class ProcessHookStubs
{
    public const string IOnTaskStartingHandler = "global::Altinn.App.Core.Features.Process.IOnTaskStartingHandler";
    public const string IOnTaskEndingHandler = "global::Altinn.App.Core.Features.Process.IOnTaskEndingHandler";
    public const string IOnTaskAbandoningHandler = "global::Altinn.App.Core.Features.Process.IOnTaskAbandoningHandler";
    public const string IOnProcessEndedHandler = "global::Altinn.App.Core.Features.Process.IOnProcessEndedHandler";
    public const string OnTaskStartingContext = "global::Altinn.App.Core.Features.Process.OnTaskStartingContext";
    public const string OnTaskEndingContext = "global::Altinn.App.Core.Features.Process.OnTaskEndingContext";
    public const string OnTaskAbandoningContext = "global::Altinn.App.Core.Features.Process.OnTaskAbandoningContext";
    public const string OnProcessEndedContext = "global::Altinn.App.Core.Features.Process.OnProcessEndedContext";
    public const string StageContext = "global::Altinn.App.Core.Features.Process.StageContext";
    public const string StageResult = "global::Altinn.App.Core.Features.Process.StageResult";
    public const string PipelineBuilder = "global::Altinn.App.Core.Features.Process.PipelineBuilder";
    public const string ProcessTaskPipeline = "global::Altinn.App.Core.Features.Process.ProcessTaskPipeline";
    public const string HandlerResult = "global::Altinn.App.Core.Features.Process.HandlerResult";
    public const string FailedHandlerResult = "global::Altinn.App.Core.Features.Process.FailedHandlerResult";

    /// <summary>The usings a fixture's hook class needs; the v8 app template has no implicit usings.</summary>
    public const string Usings = """
        using System;
        using System.Collections.Generic;
        using System.Linq;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.Platform.Storage.Interface.Models;
        using Microsoft.Extensions.Logging;
        """;

    private static string Source(bool v9)
    {
        var v8Hooks = """
            namespace Altinn.App.Core.Features
            {
                using Altinn.Platform.Storage.Interface.Models;

                public interface IProcessTaskStart
                {
                    Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill);
                }

                public interface IProcessTaskEnd
                {
                    Task End(string taskId, Instance instance);
                }

                public interface IProcessTaskAbandon
                {
                    Task Abandon(string taskId, Instance instance);
                }

                public interface IProcessEnd
                {
                    Task End(Instance instance, List<InstanceEvent>? events);
                }
            }

            namespace Altinn.App.Core.Internal.Process.ProcessTasks
            {
                using Altinn.Platform.Storage.Interface.Models;

                public interface IProcessTask
                {
                    string Type { get; }

                    Task Start(string taskId, Instance instance) => Task.CompletedTask;

                    Task End(string taskId, Instance instance) => Task.CompletedTask;

                    Task Abandon(string taskId, Instance instance) => Task.CompletedTask;
                }
            }
            """;
        var v9Hooks = """
            namespace Altinn.App.Core.Features.Process
            {
                public abstract record HandlerResult
                {
                    public static SuccessfulHandlerResult Success() => new();

                    public static FailedHandlerResult FailedPermanent(string errorMessage) => new() { ErrorMessage = errorMessage };
                }

                public sealed record SuccessfulHandlerResult : HandlerResult;

                public sealed record FailedHandlerResult : HandlerResult
                {
                    internal FailedHandlerResult() { }

                    public required string ErrorMessage { get; init; }
                }

                public interface IOnTaskStartingHandler
                {
                    bool ShouldRunForTask(string taskId);

                    Task<HandlerResult> Execute(OnTaskStartingContext context);
                }

                public interface IOnTaskEndingHandler
                {
                    bool ShouldRunForTask(string taskId);

                    Task<HandlerResult> Execute(OnTaskEndingContext context);
                }

                public interface IOnTaskAbandoningHandler
                {
                    bool ShouldRunForTask(string taskId);

                    Task<HandlerResult> Execute(OnTaskAbandoningContext context);
                }

                public interface IOnProcessEndedHandler
                {
                    Task<HandlerResult> Execute(OnProcessEndedContext context);
                }

                public sealed class OnTaskStartingContext
                {
                    public required string TaskId { get; init; }
                    public required IInstanceDataMutator InstanceDataMutator { get; init; }
                }

                public sealed class OnTaskEndingContext
                {
                    public required string TaskId { get; init; }
                    public required IInstanceDataMutator InstanceDataMutator { get; init; }
                }

                public sealed class OnTaskAbandoningContext
                {
                    public required string TaskId { get; init; }
                    public required IInstanceDataMutator InstanceDataMutator { get; init; }
                }

                public sealed class OnProcessEndedContext
                {
                    public required IInstanceDataMutator InstanceDataMutator { get; init; }
                }

                public sealed record StageContext
                {
                    public required IInstanceDataMutator InstanceDataMutator { get; init; }
                }

                public abstract record StageResult
                {
                    public static StageResult Completed() => new CompletedStageResult();
                }

                internal sealed record CompletedStageResult : StageResult;

                public sealed class PipelineBuilder
                {
                    public PipelineBuilder Stage(Func<StageContext, Task<StageResult>> work) => this;

                    public ProcessTaskPipeline Build() => new();
                }

                public sealed class ProcessTaskPipeline { }
            }

            namespace Altinn.App.Core.Internal.Process.ProcessTasks
            {
                using Altinn.App.Core.Features.Process;

                public interface IProcessTask
                {
                    string Type { get; }

                    ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();

                    ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Build();

                    ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();
                }
            }
            """;
        return $$"""
            #nullable enable
            using System;
            using System.Collections.Generic;
            using System.Net.Http;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class Instance
                {
                    public string Id { get; set; } = "";
                    public InstanceOwner InstanceOwner { get; set; } = new();
                    public ProcessState Process { get; set; } = new();
                    public List<DataElement> Data { get; set; } = new();
                    public Dictionary<string, string?>? DataValues { get; set; }
                }

                public class InstanceOwner
                {
                    public string PartyId { get; set; } = "";
                }

                public class ProcessState
                {
                    public ProcessElementInfo CurrentTask { get; set; } = new();
                }

                public class ProcessElementInfo
                {
                    public string ElementId { get; set; } = "";
                }

                public class DataElement
                {
                    public string Id { get; set; } = "";
                    public string DataType { get; set; } = "";
                }

                public class InstanceEvent { }
            }

            namespace Altinn.App.Core.Features
            {
                using Altinn.Platform.Storage.Interface.Models;

                public interface IInstanceDataAccessor
                {
                    Instance Instance { get; }
                }

                public interface IInstanceDataMutator : IInstanceDataAccessor { }
            }

            namespace Altinn.App.Core.Internal.Data
            {
                using Altinn.Platform.Storage.Interface.Models;

                public interface IDataClient
                {
                    Task<object> GetFormData(Instance instance, DataElement dataElement);

                    Task<DataElement> UpdateFormData(Instance instance, object data, DataElement dataElement);
                }

                public static class DataClientExtensions
                {
                    public static Task<T> GetFormData<T>(this IDataClient client, Instance instance, DataElement dataElement) =>
                        Task.FromResult(default(T)!);
                }
            }

            namespace Altinn.App.Core.Internal.Instances
            {
                using Altinn.Platform.Storage.Interface.Models;

                public interface IInstanceClient
                {
                    Task<Instance> UpdateDataValues(Instance instance, Dictionary<string, string?> dataValues);
                }
            }

            {{(v9 ? v9Hooks : v8Hooks)}}
            """;
    }

    private static readonly Lazy<MetadataReference> _v8 = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", Source(v9: false))
    );

    private static readonly Lazy<MetadataReference> _v9 = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", Source(v9: true))
    );

    /// <summary>
    /// A package compiled against v8 that implements a task-end hook and registers it itself. Its assembly version is
    /// the real package's, which is not the package version.
    /// </summary>
    private static readonly Lazy<MetadataReference> _package = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Dibk.Ftpb.Common.AltinnApps",
            """
            using System;
            using System.Linq;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.Platform.Storage.Interface.Models;
            using Microsoft.Extensions.DependencyInjection;

            [assembly: System.Reflection.AssemblyVersion("0.0.1.0")]

            namespace Dibk.Ftpb.Common.AltinnApps
            {
                public class ProcessTaskEnd : IProcessTaskEnd
                {
                    public Task End(string taskId, Instance instance) =>
                        taskId == "Task_1" && !instance.Data.Any(d => d.DataType == "Signatur")
                            ? throw new InvalidOperationException("Instance is missing required data element of type 'Signatur'.")
                            : Task.CompletedTask;
                }

                /// A package base class whose End the app's subclass inherits, as the Arbeidstilsynet package has.
                public abstract class PreSubmitDataModelProcessor : IProcessTaskEnd
                {
                    public Task End(string taskId, Instance instance) => ProcessDataModel(instance);

                    protected abstract Task ProcessDataModel(Instance instance);
                }

                public static class DibkCommonAltinnAppServices
                {
                    public static IServiceCollection AddDibkCommonAltinnAppServices(this IServiceCollection services) =>
                        services.AddTransient<IProcessTaskEnd, ProcessTaskEnd>();
                }
            }
            """,
            _v8.Value
        )
    );

    public static MetadataReference V8 => _v8.Value;

    public static MetadataReference V9 => _v9.Value;

    public static MetadataReference Package => _package.Value;

    /// <summary>
    /// Runs the port on the app in <paramref name="appFolder"/>, compiled against the v8 stub and
    /// <paramref name="references"/>.
    /// </summary>
    public static MigrationResult Port(string appFolder, params MetadataReference[] references) =>
        new ProcessHookPortMigration(
            SemanticScannerFactory.CreateScanner(appFolder, [V8, .. references]),
            ProcessHookPortContext.Read(appFolder)
        ).Migrate(TestContext.Current.CancellationToken);

    /// <summary>Asserts the app compiles against the v9 stub.</summary>
    public static void AssertCompilesAgainstV9(string appFolder)
    {
        var errors = SemanticScannerFactory.CompileErrors(appFolder, V9);
        Assert.True(errors.Count == 0, "The ported app does not compile against v9:\n" + string.Join("\n", errors));
    }

    public static UpgradeMessage Warning(string text) => new(text, UpgradeMessageStatus.Warning);

    public static UpgradeMessage Todo(string text) => new(text, UpgradeMessageStatus.Todo);

    public static UpgradeMessage Info(string text) => new(text, UpgradeMessageStatus.Info);

    /// <summary>The port's warning for a class that now implements <paramref name="v9Interface"/>.</summary>
    public static UpgradeMessage Ported(string location, string type, string v9Interface) =>
        Warning(
            $"{location}: {type} now implements {v9Interface}. v9 runs it inside the process transition and runs it "
                + "again when a step fails, so calls it makes to other systems, such as e-mail, case numbers or "
                + "external APIs, can repeat."
        );

    /// <summary>The line <paramref name="text"/> first occurs on in <paramref name="source"/>.</summary>
    public static int LineOf(string source, string text)
    {
        var index = source.IndexOf(text, StringComparison.Ordinal);
        return index < 0
            ? throw new ArgumentException($"Not in the fixture: {text}", nameof(text))
            : source[..index].Count(static c => c == '\n') + 1;
    }

    /// <summary>A class in the app's namespace, after <see cref="Usings"/>.</summary>
    public static string InApp(string members) =>
        $$"""
            {{Usings}}

            namespace App.Logic;

            {{members}}
            """;

    /// <summary>
    /// The app's <c>Program</c>, registering services in <c>RegisterCustomAppServices</c>, one statement per
    /// registration.
    /// </summary>
    public static string Program(params string[] registrations) =>
        """
            using Altinn.App.Core.Features;
            using App.Logic;
            using Microsoft.Extensions.DependencyInjection;

            namespace App;

            public static class Program
            {
                public static void RegisterCustomAppServices(IServiceCollection services)
                {

            """
        + string.Concat(registrations.Select(static registration => $"        {registration}\n"))
        + """
                }
            }

            """;

    /// <summary>
    /// The v8 template's <c>Program</c>: top-level statements, registering services in the local function
    /// <c>RegisterCustomAppServices</c>, one statement per registration.
    /// </summary>
    public static string TopLevelProgram(params string[] registrations) =>
        """
            using Altinn.App.Core.Features;
            using App.Logic;
            using Microsoft.Extensions.DependencyInjection;

            void RegisterCustomAppServices(IServiceCollection services)
            {

            """
        + string.Concat(registrations.Select(static registration => $"    {registration}\n"))
        + """
            }

            """;
}
