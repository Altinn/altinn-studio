using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// <c>Altinn.App.Core</c> with the Storage clients the call rewrite binds to, in their v8 shape, and the instance data
/// mutator with the members of PR B (#21485) in its v9 shape. The v9 stub keeps the v8 clients and service task, which
/// v9 still has or which other upgrade steps move; it lacks the v8 hooks and <c>GenerateAndStorePdf</c>.
/// </summary>
internal static class StorageCallStubs
{
    public const string HookPath = "logic/Hook.cs";
    public const string MetadataPath = "config/applicationmetadata.json";

    public const string IOnTaskStartingHandler = ProcessHookStubs.IOnTaskStartingHandler;
    public const string IOnTaskEndingHandler = ProcessHookStubs.IOnTaskEndingHandler;
    public const string IOnProcessEndedHandler = ProcessHookStubs.IOnProcessEndedHandler;
    public const string OnTaskStartingContext = ProcessHookStubs.OnTaskStartingContext;
    public const string OnTaskEndingContext = ProcessHookStubs.OnTaskEndingContext;
    public const string OnProcessEndedContext = ProcessHookStubs.OnProcessEndedContext;
    public const string HandlerResult = ProcessHookStubs.HandlerResult;
    public const string IInstanceDataMutator = ProcessHookStubs.IInstanceDataMutator;
    public const string DataElementIdentifier = "global::Altinn.App.Core.Models.DataElementIdentifier";
    public const string MemoryStreamType = "global::System.IO.MemoryStream";

    /// <summary>The usings a fixture's class needs; the v8 app template has no implicit usings.</summary>
    public const string Usings = """
        using System;
        using System.Collections.Generic;
        using System.IO;
        using System.Linq;
        using System.Text;
        using System.Threading;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Internal.Data;
        using Altinn.App.Core.Internal.Instances;
        using Altinn.App.Core.Models;
        using Altinn.Platform.Storage.Interface.Models;
        using Microsoft.Extensions.Logging;
        """;

    private const string Models = """
        namespace Altinn.Platform.Storage.Interface.Models
        {
            public class Instance
            {
                public string Id { get; set; } = "";
                public string Org { get; set; } = "";
                public string AppId { get; set; } = "";
                public InstanceOwner InstanceOwner { get; set; } = new();
                public ProcessState Process { get; set; } = new();
                public List<DataElement> Data { get; set; } = new();
                public Dictionary<string, string?>? DataValues { get; set; }
                public Dictionary<string, string?>? PresentationTexts { get; set; }
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
                public string InstanceGuid { get; set; } = "";
                public string DataType { get; set; } = "";
                public string? ContentType { get; set; }
                public string? Filename { get; set; }
                public bool Locked { get; set; }
                public List<string> Tags { get; set; } = new();
                public List<KeyValueEntry>? Metadata { get; set; }
                public List<KeyValueEntry>? UserDefinedMetadata { get; set; }
                public List<Guid>? Refs { get; set; }
            }

            public class KeyValueEntry
            {
                public string? Key { get; set; }
                public string? Value { get; set; }
            }

            public class Substatus
            {
                public string? Label { get; set; }
                public string? Description { get; set; }
            }

            public class DataValues
            {
                public Dictionary<string, string?> Values { get; set; } = new();
            }

            public class PresentationTexts
            {
                public Dictionary<string, string?> Texts { get; set; } = new();
            }

            public class DataType
            {
                public string Id { get; set; } = "";
            }

            public class InstanceEvent { }
        }

        namespace Altinn.App.Core.Models
        {
            using Altinn.Platform.Storage.Interface.Models;

            public class InstanceIdentifier
            {
                public InstanceIdentifier(Instance instance) { }
                public InstanceIdentifier(string instanceId) { }
                public InstanceIdentifier(int instanceOwnerPartyId, Guid instanceGuid) { }
                public int InstanceOwnerPartyId { get; }
                public Guid InstanceGuid { get; }
                public string GetInstanceId() => "";
            }

            public readonly struct DataElementIdentifier
            {
                public DataElementIdentifier(string id) { Id = id; }
                public DataElementIdentifier(Guid guid) { Id = guid.ToString(); }
                public string Id { get; }
                public static implicit operator DataElementIdentifier(DataElement dataElement) => new(dataElement.Id);
            }
        }

        namespace Altinn.App.Core.Features
        {
            public sealed record StorageAuthenticationMethod
            {
                public static StorageAuthenticationMethod ServiceOwner() => new();
                public static StorageAuthenticationMethod CurrentUser() => new();
            }
        }

        namespace Altinn.App.Core.Features
        {
            using Altinn.Platform.Storage.Interface.Models;

            public interface ITaskValidator
            {
                Task<List<object>> ValidateTask(Instance instance, string taskId, string? language);
            }

            public interface IDataElementValidator
            {
                string DataType { get; }

                Task<List<object>> ValidateDataElement(Instance instance, DataElement dataElement, DataType dataType, string? language);
            }
        }

        namespace Altinn.App.Core.EFormidling.Interface
        {
            using Altinn.Platform.Storage.Interface.Models;

            public interface IEFormidlingReceivers
            {
                Task<List<object>> GetEFormidlingReceivers(Instance instance);
            }
        }

        namespace Altinn.App.Core.Features.Auth
        {
            public abstract class Authenticated { }

            public interface IAuthenticationContext
            {
                Authenticated Current { get; }
            }
        }

        namespace Altinn.App.Core.Internal.Data
        {
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Models;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IDataClient
            {
                Task<DataElement> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, string dataType, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default) where T : notnull;
                Task<DataElement> InsertFormData(Instance instance, string dataTypeId, object dataToSerialize, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<DataElement> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default) where T : notnull;
                Task<DataElement> UpdateFormData(Instance instance, object dataToSerialize, DataElement dataElement, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<object> GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<object> GetFormData(Instance instance, DataElement dataElement, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<Stream> GetBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataId, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<Stream> GetBinaryData(int instanceOwnerPartyId, Guid instanceGuid, Guid dataId, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<byte[]> GetDataBytes(int instanceOwnerPartyId, Guid instanceGuid, Guid dataId, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<bool> DeleteData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, bool delay, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<bool> DeleteData(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, bool delay, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid);
                Task<DataElement> UpdateBinaryData(InstanceIdentifier instanceIdentifier, string? contentType, string? filename, Guid dataGuid, Stream stream, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string? filename, Stream stream, string? generatedFromTask = null, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<DataElement> Update(Instance instance, DataElement dataElement, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<DataElement> LockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
                Task<DataElement> UnlockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default);
            }

            public static class IDataClientExtensions
            {
                public static Task<T> GetFormData<T>(this IDataClient dataClient, Instance instance, DataElement dataElement, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken cancellationToken = default) =>
                    Task.FromResult(default(T)!);
            }
        }

        namespace Altinn.App.Core.Internal.Instances
        {
            using Altinn.App.Core.Features;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IInstanceClient
            {
                Task<Instance> GetInstance(string app, string org, int instanceOwnerPartyId, Guid instanceId, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> GetInstance(Instance instance, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> AddCompleteConfirmation(int instanceOwnerPartyId, Guid instanceGuid, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> UpdateReadStatus(int instanceOwnerPartyId, Guid instanceGuid, string readStatus, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> UpdateSubstatus(int instanceOwnerPartyId, Guid instanceGuid, Substatus substatus, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> UpdatePresentationTexts(int instanceOwnerPartyId, Guid instanceGuid, PresentationTexts presentationTexts, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> UpdateDataValues(int instanceOwnerPartyId, Guid instanceGuid, DataValues dataValues, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default);
                Task<Instance> UpdateDataValues(Instance instance, Dictionary<string, string?> dataValues, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default) => Task.FromResult(instance);
                Task<Instance> UpdateDataValue(Instance instance, string key, string? value, StorageAuthenticationMethod? authenticationMethod = null, CancellationToken ct = default) => Task.FromResult(instance);
            }
        }
        """;

    private const string V8Hooks = """
        namespace Altinn.App.Core.Features
        {
            using Altinn.App.Core.Models;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IInstanceDataAccessor
            {
                Instance Instance { get; }
            }

            public interface IInstanceDataMutator : IInstanceDataAccessor { }

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

            public interface IInstantiationProcessor
            {
                Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill);
            }
        }

        namespace Altinn.App.Core.Internal.Pdf
        {
            using Altinn.Platform.Storage.Interface.Models;

            public interface IPdfService
            {
                Task GenerateAndStorePdf(Instance instance, string taskId, CancellationToken ct);
            }
        }
        """;

    private const string V9Hooks = """
        namespace Altinn.App.Core.Features
        {
            using Altinn.App.Core.Models;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IInstanceDataAccessor
            {
                Instance Instance { get; }
                string? Language { get; }
                IReadOnlyCollection<DataType> DataTypes { get; }
                Task<object> GetFormData(DataElementIdentifier dataElementIdentifier);
                Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier);
                DataElement GetDataElement(DataElementIdentifier dataElementIdentifier);
                void OverrideAuthenticationMethod(DataType dataType, StorageAuthenticationMethod method);
            }

            public static class IInstanceDataAccessorExtensions
            {
                public static DataType GetDataType(this IInstanceDataAccessor dataAccessor, string dataTypeId) => new();
                public static DataType GetDataType(this IInstanceDataAccessor dataAccessor, DataElementIdentifier dataElementIdentifier) => new();
                public static Task<T> GetFormData<T>(this IInstanceDataAccessor accessor, DataElementIdentifier dataElementIdentifier) where T : class => Task.FromResult(default(T)!);
                public static IEnumerable<DataElement> GetDataElementsForType(this IInstanceDataAccessor accessor, string dataTypeId) => accessor.Instance.Data;
            }

            public interface IInstanceDataMutator : IInstanceDataAccessor
            {
                FormDataChange AddFormDataElement(string dataTypeId, object model);
                BinaryDataChange AddBinaryDataElement(string dataTypeId, string contentType, string? filename, ReadOnlyMemory<byte> bytes, string? generatedFromTask = null, List<KeyValueEntry>? metadata = null);
                BinaryDataChange UpdateBinaryDataElement(DataElementIdentifier dataElementIdentifier, string contentType, ReadOnlyMemory<byte> bytes);
                void RemoveDataElement(DataElementIdentifier dataElementIdentifier);
                Task<object> GetFormDataCopy(DataElementIdentifier dataElementIdentifier);
                Task ReplaceFormData(DataElementIdentifier dataElementIdentifier, object model);
                void UpdateDataElementMetadata(DataElementIdentifier dataElementIdentifier, DataElementMetadataUpdate update);
                void SetDataValue(string key, string? value);
                void SetPresentationText(string key, string? value);
                void SetSubstatus(Substatus substatus);
                void AddCompleteConfirmation();
            }

            public static class IInstanceDataMutatorExtensions
            {
                public static Task<T> GetFormDataCopy<T>(this IInstanceDataMutator mutator, DataElementIdentifier dataElementIdentifier) where T : class => Task.FromResult(default(T)!);
            }

            public interface IInstantiationProcessor
            {
                Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) => Task.CompletedTask;
                Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) => DataCreation(instanceDataMutator.Instance, data, prefill);
            }
        }

        namespace Altinn.App.Core.Models
        {
            using Altinn.Platform.Storage.Interface.Models;

            public sealed class FormDataChange
            {
                public DataElementIdentifier DataElementIdentifier { get; }
            }

            public sealed class BinaryDataChange
            {
                public DataElementIdentifier DataElementIdentifier { get; }
            }

            public sealed record DataElementMetadataUpdate
            {
                public IReadOnlyList<string>? Tags { get; init; }
                public IReadOnlyList<KeyValueEntry>? Metadata { get; init; }
                public IReadOnlyList<KeyValueEntry>? UserDefinedMetadata { get; init; }
                public IReadOnlyList<Guid>? Refs { get; init; }
                public string? Filename { get; init; }
            }
        }

        namespace Altinn.App.Core.Features.Process
        {
            public abstract record HandlerResult
            {
                public static SuccessfulHandlerResult Success() => new();
            }

            public sealed record SuccessfulHandlerResult : HandlerResult;

            public sealed record FailedHandlerResult : HandlerResult;

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
        }

        namespace Altinn.App.Core.Internal.Pdf
        {
            public interface IPdfService { }
        }
        """;

    private const string ServiceTasks = """
        namespace Altinn.App.Core.Internal.Process.ProcessTasks
        {
            using Altinn.Platform.Storage.Interface.Models;

            public interface IProcessTask
            {
                string Type { get; }
            }
        }

        namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks
        {
            using Altinn.App.Core.Features;

            public interface IServiceTask : Altinn.App.Core.Internal.Process.ProcessTasks.IProcessTask
            {
                Task<ServiceTaskResult> Execute(ServiceTaskContext context);
            }

            public sealed record ServiceTaskContext
            {
                public required IInstanceDataMutator InstanceDataMutator { get; init; }
            }

            public abstract record ServiceTaskResult
            {
                public static ServiceTaskResult Success() => new ServiceTaskSuccessResult();
                public static ServiceTaskResult FailedContinueProcessNext(string? action = "reject") => new ServiceTaskFailedResult();
                public static ServiceTaskResult FailedAbortProcessNext() => new ServiceTaskFailedResult();
            }

            public sealed record ServiceTaskSuccessResult : ServiceTaskResult;

            public sealed record ServiceTaskFailedResult : ServiceTaskResult;
        }
        """;

    private static string Source(bool v9) =>
        $$"""
            #nullable enable
            using System;
            using System.Collections.Generic;
            using System.IO;
            using System.Threading;
            using System.Threading.Tasks;

            {{Models}}

            {{(v9 ? V9Hooks : V8Hooks)}}

            {{ServiceTasks}}
            """;

    private static readonly Lazy<MetadataReference> _v8 = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", Source(v9: false))
    );

    private static readonly Lazy<MetadataReference> _v9 = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", Source(v9: true))
    );

    /// <summary>AT.Common.Altinn.Extensions 4.3.0's helpers that name the instance (KnownIdentityHelpers, W1).</summary>
    private static readonly Lazy<MetadataReference> _atExtensions = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "AT.Common.Altinn.Extensions",
            """
            using System;
            using Altinn.Platform.Storage.Interface.Models;

            [assembly: System.Reflection.AssemblyVersion("4.3.0.0")]

            namespace AT.Common.Altinn.Extensions
            {
                public static class InstanceExtensions
                {
                    public static Guid GetInstanceGuid(this Instance instance) => Guid.Parse(instance.Id.Split("/")[1]);

                    public static int GetInstanceOwnerPartyId(this Instance instance) => int.Parse(instance.InstanceOwner.PartyId);
                }

                public static class DataClientExtensions
                {
                    public static System.Threading.Tasks.Task<object> GetSkjemaData(this global::Altinn.App.Core.Internal.Data.IDataClient dataClient, Instance instance) =>
                        dataClient.GetFormData(instance, instance.Data[0]);
                }
            }
            """,
            _v8.Value
        )
    );

    /// <summary>StatisticsNorway.Altinn3.App.Metadata 1.1.0, whose AddSkjemaInfo writes data values (P-PKG).</summary>
    private static readonly Lazy<MetadataReference> _ssb = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn3.App.Metadata",
            """
            using System.Threading.Tasks;
            using Altinn.App.Core.Internal.Instances;
            using Altinn.Platform.Storage.Interface.Models;

            [assembly: System.Reflection.AssemblyVersion("1.1.0.0")]

            namespace StatisticsNorway.Altinn3.App.Metadata
            {
                public class MetadataUtils(IInstanceClient instanceClient)
                {
                    public Task AddSkjemaInfo(object data, Instance instance) => instanceClient.UpdateDataValue(instance, "raNummer", "RA-0628");
                }
            }
            """,
            _v8.Value
        )
    );

    /// <summary>
    /// Dibk.Ftpb.Common.AltinnApps 1.7.0's validator base, which stores its report with IDataClient on every validation.
    /// Its assembly version is 0.0.1, as the real package's; the informational version is the package's.
    /// </summary>
    private static readonly Lazy<MetadataReference> _dibkValidator = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Dibk.Ftpb.Common.AltinnApps",
            """
            using System.Collections.Generic;
            using System.IO;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Internal.Data;
            using Altinn.Platform.Storage.Interface.Models;

            [assembly: System.Reflection.AssemblyVersion("0.0.1.0")]
            [assembly: System.Reflection.AssemblyInformationalVersion("1.7.0+ae327bac91a1278f991b3f17b03a0714fd8452d4")]

            namespace Dibk.Ftpb.Common.AltinnApps.Validator
            {
                public abstract class DataElementValidatorBase<T>(IDataClient dataClient) : IDataElementValidator
                {
                    public abstract string DataType { get; }

                    public virtual async Task<List<object>> ValidateDataElement(Instance instance, DataElement dataElement, DataType dataType, string? language)
                    {
                        await dataClient.InsertBinaryData(instance.Id, "Valideringsrapport", "application/xml", "rapport.xml", new MemoryStream());
                        return [];
                    }
                }
            }
            """,
            _v8.Value
        )
    );

    /// <summary>A package the upgrade knows nothing about whose class gets IDataClient.</summary>
    private static readonly Lazy<MetadataReference> _unknownPackage = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Acme.Archive",
            """
            using System.Threading.Tasks;
            using Altinn.App.Core.Internal.Data;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Acme.Archive
            {
                public class Archiver(IDataClient dataClient)
                {
                    public Task Archive(Instance instance) => dataClient.GetFormData(instance, instance.Data[0]);
                }
            }
            """,
            _v8.Value
        )
    );

    public static MetadataReference V8 => _v8.Value;

    public static MetadataReference V9 => _v9.Value;

    public static MetadataReference AtExtensions => _atExtensions.Value;

    public static MetadataReference Ssb => _ssb.Value;

    public static MetadataReference DibkValidator => _dibkValidator.Value;

    public static MetadataReference UnknownPackage => _unknownPackage.Value;

    /// <summary>Runs the port on the app in <paramref name="appFolder"/>, compiled against the v8 stub and <paramref name="references"/>.</summary>
    public static MigrationResult Port(string appFolder, params MetadataReference[] references) =>
        new ProcessHookPortMigration(
            SemanticScannerFactory.CreateScanner(appFolder, [V8, .. references]),
            ProcessHookPortContext.Read(appFolder)
        ).Migrate(TestContext.Current.CancellationToken);

    /// <summary>
    /// Runs the port as <see cref="Port"/> does, for an upgrade whose Altinn.App libraries describe the actor who started a
    /// transition in callbacks.
    /// </summary>
    public static MigrationResult PortWithCallbackActor(string appFolder) =>
        new ProcessHookPortMigration(
            SemanticScannerFactory.CreateScanner(appFolder, V8),
            ProcessHookPortContext.Read(appFolder) with
            {
                CallbackActorIsKnown = true,
            }
        ).Migrate(TestContext.Current.CancellationToken);

    /// <summary>Runs the port again on an app that was upgraded, which compiles against the v9 stub.</summary>
    public static MigrationResult PortAgain(string appFolder) =>
        new ProcessHookPortMigration(
            SemanticScannerFactory.CreateScanner(appFolder, V9),
            ProcessHookPortContext.Read(appFolder)
        ).Migrate(TestContext.Current.CancellationToken);

    /// <summary>Asserts the app compiles against the v9 stub (and <paramref name="references"/>).</summary>
    public static void AssertCompilesAgainstV9(string appFolder, params MetadataReference[] references)
    {
        var errors = CompileErrors(appFolder, [V9, .. references]);
        Assert.True(errors.Count == 0, "The ported app does not compile against v9:\n" + string.Join("\n", errors));
    }

    /// <summary>The compile errors of the app against <paramref name="references"/> and the runtime.</summary>
    public static IReadOnlyList<Diagnostic> CompileErrors(string appFolder, IEnumerable<MetadataReference> references)
    {
        var trees = Directory
            .EnumerateFiles(appFolder, "*.cs", SearchOption.AllDirectories)
            .Select(path => CSharpSyntaxTree.ParseText(File.ReadAllText(path), path: path));
        return CSharpCompilation
            .Create(
                "Altinn.Application",
                trees,
                _runtime.Value.Concat(references),
                new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
            )
            .GetDiagnostics()
            .Where(static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
            .ToList();
    }

    private static readonly Lazy<IReadOnlyList<MetadataReference>> _runtime = new(static () =>
        [
            .. (
                AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
                ?? throw new InvalidOperationException("TRUSTED_PLATFORM_ASSEMBLIES not available")
            )
                .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
                .Select(static path => MetadataReference.CreateFromFile(path)),
        ]
    );

    public static UpgradeMessage Warning(string text) => new(text, UpgradeMessageStatus.Warning);

    public static UpgradeMessage Todo(string text) => new(text, UpgradeMessageStatus.Todo);

    /// <summary>A class in the app's namespace, after <see cref="Usings"/>.</summary>
    public static string InApp(string members) =>
        $$"""
            {{Usings}}

            namespace App.Logic;

            {{members}}
            """;

    /// <summary>The message the port reports at the line of the hook file where <paramref name="anchor"/> first occurs.</summary>
    public static UpgradeMessage At(string source, string anchor, UpgradeMessageStatus status, string text) =>
        new($"{HookPath}:{LineOf(InApp(source), anchor)}: {text}", status);

    /// <summary>The line <paramref name="text"/> first occurs on in <paramref name="source"/>.</summary>
    public static int LineOf(string source, string text) => ProcessHookStubs.LineOf(source, text);
}
