using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9.KnownScenarios;

public sealed class UnlockWriteRelockInProcessDataReadScenarioTests : IDisposable
{
    /// <summary>The <c>IDataClient</c> surface an app compiles against.</summary>
    public enum Surface
    {
        /// <summary>
        /// 8.7.2 and 8.8.3: one overload per member, with optional trailing parameters, and no <c>UpdateFormData</c>.
        /// </summary>
        Old,

        /// <summary>
        /// 8.11.3 and 8.12.7: also short default-implemented overloads, <c>UpdateFormData</c>, and an obsolete
        /// <c>UpdateData</c>.
        /// </summary>
        New,
    }

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private const string StubTypes = """
        #nullable enable
        using System;
        using System.Collections.Generic;
        using System.Threading;
        using System.Threading.Tasks;

        namespace Altinn.Platform.Storage.Interface.Models
        {
            public class Instance
            {
                public InstanceOwner InstanceOwner { get; set; } = new();
                public ProcessState? Process { get; set; }
                public List<DataElement> Data { get; set; } = new();
            }

            public class InstanceOwner
            {
                public string PartyId { get; set; } = "";
            }

            public class ProcessState
            {
                public ProcessElementInfo? CurrentTask { get; set; }
            }

            public class ProcessElementInfo
            {
                public string? ElementId { get; set; }
            }

            public class DataElement
            {
                public string Id { get; set; } = "";
            }
        }

        namespace Altinn.App.Core.Models
        {
            public class InstanceIdentifier
            {
                public InstanceIdentifier(Altinn.Platform.Storage.Interface.Models.Instance instance) { }

                public Guid InstanceGuid { get; }
            }

            public sealed class AppIdentifier
            {
                public AppIdentifier(string org, string app)
                {
                    Org = org;
                    App = app;
                }

                public string Org { get; }
                public string App { get; }
            }
        }

        namespace Altinn.App.Core.Features.Payment.Models
        {
            public class PaymentInformation { }
        }

        namespace Altinn.App.Core.Features
        {
            using Altinn.Platform.Storage.Interface.Models;

            public sealed class StorageAuthenticationMethod { }

            public interface IDataProcessor
            {
                public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language);

                public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previousData, string? language);
            }
        }

        """;

    private const string OldDataClient = """
        namespace Altinn.App.Core.Internal.Data
        {
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Models;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IDataClient
            {
                Task<DataElement> UpdateData<T>(
                    T dataToSerialize,
                    Guid instanceGuid,
                    Type type,
                    string org,
                    string app,
                    int instanceOwnerPartyId,
                    Guid dataId,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                )
                    where T : notnull;

                Task<DataElement> Update(
                    Instance instance,
                    DataElement dataElement,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                );

                Task<DataElement> LockDataElement(
                    InstanceIdentifier instanceIdentifier,
                    Guid dataGuid,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                );

                Task<DataElement> UnlockDataElement(
                    InstanceIdentifier instanceIdentifier,
                    Guid dataGuid,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                );
            }
        }
        """;

    private const string NewDataClient = """
        namespace Altinn.App.Core.Internal.Data
        {
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Models;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IDataClient
            {
                [Obsolete("Use the UpdateFormData method with Instance parameter instead")]
                Task<DataElement> UpdateData<T>(
                    T dataToSerialize,
                    Guid instanceGuid,
                    Type type,
                    string org,
                    string app,
                    int instanceOwnerPartyId,
                    Guid dataId,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                )
                    where T : notnull;

                [Obsolete("Use the UpdateFormData method with Instance parameter instead")]
                Task<DataElement> UpdateData<T>(
                    T dataToSerialize,
                    Guid instanceGuid,
                    Type type,
                    string org,
                    string app,
                    int instanceOwnerPartyId,
                    Guid dataId
                )
                    where T : notnull =>
                    UpdateData(dataToSerialize, instanceGuid, type, org, app, instanceOwnerPartyId, dataId, null, default);

                Task<DataElement> UpdateFormData(
                    Instance instance,
                    object dataToSerialize,
                    DataElement dataElement,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                );

                Task<DataElement> UpdateFormData(Instance instance, object dataToSerialize, DataElement dataElement) =>
                    UpdateFormData(instance, dataToSerialize, dataElement, null, default);

                Task<DataElement> Update(
                    Instance instance,
                    DataElement dataElement,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                );

                Task<DataElement> Update(Instance instance, DataElement dataElement) =>
                    Update(instance, dataElement, null, default);

                Task<DataElement> LockDataElement(
                    InstanceIdentifier instanceIdentifier,
                    Guid dataGuid,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                );

                Task<DataElement> LockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid) =>
                    LockDataElement(instanceIdentifier, dataGuid, null, default);

                Task<DataElement> UnlockDataElement(
                    InstanceIdentifier instanceIdentifier,
                    Guid dataGuid,
                    StorageAuthenticationMethod? authenticationMethod = null,
                    CancellationToken cancellationToken = default
                );

                Task<DataElement> UnlockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid) =>
                    UnlockDataElement(instanceIdentifier, dataGuid, null, default);
            }
        }
        """;

    private static readonly Lazy<MetadataReference> _oldSurface = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", StubTypes + OldDataClient)
    );

    private static readonly Lazy<MetadataReference> _newSurface = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", StubTypes + NewDataClient)
    );

    private static MetadataReference Stub(Surface surface) =>
        surface == Surface.Old ? _oldSurface.Value : _newSurface.Value;

    /// <summary>The app's own types the fixtures use: its models, and the helper that fills in the receipt.</summary>
    private const string Models = """
        using Altinn.App.Core.Features.Payment.Models;
        using Altinn.App.Core.Models;

        namespace Altinn.App.Models
        {
            public class Form { }

            public class Other { }

            public class model
            {
                public static model operator ++(model value) => value;

                public static model operator --(model value) => value;

                public static int operator +(model value, int number) => number;

                public static int operator -(model value) => 0;

                public static explicit operator int(model value) => 0;

                public static explicit operator Other(model value) => new Other();
            }

            public static class Forms
            {
                public static void Reset(ref model value) { }

                public static bool TryCreate(out model value)
                {
                    value = new model();
                    return true;
                }
            }

            public interface IDataModelManager
            {
                void SetPaymentReceiptData(object form, PaymentInformation paymentInformation, InstanceIdentifier instanceIdentifier);
            }
        }
        """;

    private static string Message(string path, int line) =>
        $"{path}:{line}: removed the unlock, write and lock of the data element being read in ProcessDataRead. "
        + "v9 refuses them while the workflow engine processes the instance, as when it renders the payment receipt. "
        + "Changes the method makes to the form data are still shown, but no longer saved.";

    private static string TypeMessage(string path, int line) =>
        Message(path, line) + " The removed write passed a type instead of the data, so it failed in v8 too.";

    private static UpgradeMessage Warning(string text) => new(text, UpgradeMessageStatus.Warning);

    /// <summary>Writes the models and the file at <paramref name="path"/>, and scans the app.</summary>
    private CSharpSourceScanner Scanner(Surface surface, string path, string source)
    {
        _app.Write("Models.cs", Models);
        _app.Write(path, source);
        return SemanticScannerFactory.CreateScanner(AppFolder, Stub(surface));
    }

    private MigrationResult Apply(CSharpSourceScanner scanner) =>
        new UnlockWriteRelockInProcessDataReadScenario().Apply(scanner, AppFolder);

    /// <summary>The line <paramref name="text"/> first occurs on in <paramref name="source"/>.</summary>
    private static int LineOf(string source, string text)
    {
        var index = source.IndexOf(text, StringComparison.Ordinal);
        return index < 0
            ? throw new ArgumentException($"Not in the fixture: {text}", nameof(text))
            : source[..index].Count(static c => c == '\n') + 1;
    }

    /// <summary><paramref name="text"/> with <paramref name="old"/> replaced, which must occur in it.</summary>
    private static string Replace(string text, string old, string replacement) =>
        text.Contains(old, StringComparison.Ordinal)
            ? text.Replace(old, replacement, StringComparison.Ordinal)
            : throw new ArgumentException($"Not in the fixture: {old}", nameof(old));

    // --- The shapes of the apps the scenario was found in ------------------------------------------

    /// <summary>A payment processor shaped like those the scenario was found in, with this ProcessDataRead.</summary>
    private static string PaymentProcessor(string processDataRead) =>
        $$"""
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Features.Payment.Models;
            using Altinn.App.Core.Internal.Data;
            using Altinn.App.Core.Models;
            using Altinn.App.Models;
            using Altinn.Platform.Storage.Interface.Models;
            using System;
            using System.Threading.Tasks;

            namespace Altinn.App.logic.payment
            {
                public class PaymentProcessor : IDataProcessor
                {
                    private readonly IDataClient _Data;
                    private readonly IDataModelManager _dataModelManager;

                    public PaymentProcessor(IDataClient Data, IDataModelManager dataModelManager)
                    {
                        _Data = Data;
                        _dataModelManager = dataModelManager;
                    }

            {{processDataRead}}

                    private Task<AppIdentifier> GetAppIdentifier()
                    {
                        return Task.FromResult(new AppIdentifier("ttd", "payment"));
                    }

                    private Task<PaymentInformation> GetPaymentInformation(Instance instance, AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, int instanceOwnerPartyId) => Task.FromResult(new PaymentInformation());

                    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language)
                    {
                        return Task.CompletedTask;
                    }
                }
            }
            """;

    /// <summary>
    /// Asserts that the scenario turns <paramref name="processDataRead"/> into <paramref name="rewritten"/>, leaving
    /// the rest of the file as it was, reports <paramref name="message"/>, and leaves an app that still compiles.
    /// </summary>
    private void AssertRewritten(Surface surface, string path, string processDataRead, string rewritten, string message)
    {
        var scanner = Scanner(surface, path, PaymentProcessor(processDataRead));

        var result = Apply(scanner);

        Assert.Equal(PaymentProcessor(rewritten), _app.Read(path));
        Assert.Equal([Warning(message)], result.Messages);
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, Stub(surface)));
    }

    [Fact]
    public void RemovesTheRunAfterTheReceiptDataIsSet_OnTheNewSurface()
    {
        // lt/background-check: UpdateData<Form> after SetPaymentReceiptData, the run ending the block.
        var path = Path.Combine("logic", "DataProcessors", "PaymentProcessor.cs");
        AssertRewritten(
            Surface.New,
            path,
            """
                    /// <summary>
                    /// Copies the payment details into the form for the payment receipt.
                    /// </summary>
                    public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
                    {
                        if (instance?.Process?.CurrentTask?.ElementId == "Task_Payment" && data is Form form)
                        {
                            AppIdentifier appIdentifier = await GetAppIdentifier();
                            InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

                            PaymentInformation paymentInformation = await GetPaymentInformation(instance, appIdentifier, instanceIdentifier, instanceOwnerPartyId);

                            if (paymentInformation != null)
                            {
                                _dataModelManager.SetPaymentReceiptData(form, paymentInformation, instanceIdentifier);

                                DataElement dataElement = await _Data.UnlockDataElement(instanceIdentifier, (Guid)dataId);
                                await _Data.Update(instance, dataElement);

                                await _Data.UpdateData<Form>(
                                    form,
                                    instanceIdentifier.InstanceGuid,
                                    typeof(Form),
                                    appIdentifier.Org,
                                    appIdentifier.App,
                                    instanceOwnerPartyId,
                                    (Guid)dataId
                                );

                                dataElement = await _Data.LockDataElement(instanceIdentifier, (Guid)dataId);
                                await _Data.Update(instance, dataElement);
                            }
                        }
                    }
            """,
            """
                    /// <summary>
                    /// Copies the payment details into the form for the payment receipt.
                    /// </summary>
                    public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
                    {
                        if (instance?.Process?.CurrentTask?.ElementId == "Task_Payment" && data is Form form)
                        {
                            AppIdentifier appIdentifier = await GetAppIdentifier();
                            InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

                            PaymentInformation paymentInformation = await GetPaymentInformation(instance, appIdentifier, instanceIdentifier, instanceOwnerPartyId);

                            if (paymentInformation != null)
                            {
                                _dataModelManager.SetPaymentReceiptData(form, paymentInformation, instanceIdentifier);
                            }
                        }
                    }
            """,
            Message(path, 40)
        );
    }

    [Fact]
    public void RemovesTheRunThatPassesATypeAsTheData_AndSaysItFailedInV8()
    {
        // dmf/driftskonsesjon-overdra and dmf/utvinningsrett-soknad: UpdateFormData(instance, typeof(model), ...),
        // the run being the whole block.
        var path = Path.Combine("Core", "Payment", "PaymentProcessor.cs");
        AssertRewritten(
            Surface.New,
            path,
            """
                    public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
                    {
                        if (instance?.Process?.CurrentTask?.ElementId == "Task_Transfer" && data is model form)
                        {
                            AppIdentifier appIdentifier = await GetAppIdentifier();
                            InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

                            PaymentInformation paymentInformation = await GetPaymentInformation(instance, appIdentifier, instanceIdentifier, instanceOwnerPartyId);

                            if (paymentInformation != null)
                            {
                                DataElement dataElement = await _Data.UnlockDataElement(instanceIdentifier, (Guid)dataId);
                                await _Data.Update(instance, dataElement);

                                await _Data.UpdateFormData(
                                    instance,
                                    typeof(model),
                                    dataElement
                                );

                                dataElement = await _Data.LockDataElement(instanceIdentifier, (Guid)dataId);
                                await _Data.Update(instance, dataElement);
                            }
                        }

                        await Task.CompletedTask;
                    }
            """,
            """
                    public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
                    {
                        if (instance?.Process?.CurrentTask?.ElementId == "Task_Transfer" && data is model form)
                        {
                            AppIdentifier appIdentifier = await GetAppIdentifier();
                            InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

                            PaymentInformation paymentInformation = await GetPaymentInformation(instance, appIdentifier, instanceIdentifier, instanceOwnerPartyId);

                            if (paymentInformation != null)
                            {
                            }
                        }

                        await Task.CompletedTask;
                    }
            """,
            TypeMessage(path, 35)
        );
    }

    // --- Variations on one processor --------------------------------------------------------------

    private static readonly string ProcessorPath = Path.Combine("logic", "PaymentProcessor.cs");

    /// <summary>A processor with one run, which the scenario removes. The theories below vary it.</summary>
    private const string Kept = """
        using System;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Internal.Data;
        using Altinn.App.Core.Models;
        using Altinn.App.Models;
        using Altinn.Platform.Storage.Interface.Models;

        namespace Altinn.App.logic
        {
            public class PaymentProcessor : IDataProcessor
            {
                private readonly IDataClient _Data;

                public PaymentProcessor(IDataClient Data)
                {
                    _Data = Data;
                }

                public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
                {
                    if (data is model form)
                    {
                        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

                        DataElement dataElement = await _Data.UnlockDataElement(instanceIdentifier, (Guid)dataId);
                        await _Data.Update(instance, dataElement);
                        await _Data.UpdateData<model>(form, instanceIdentifier.InstanceGuid, typeof(model), "ttd", "app", instanceOwnerPartyId, (Guid)dataId);
                        dataElement = await _Data.LockDataElement(instanceIdentifier, (Guid)dataId);
                        await _Data.Update(instance, dataElement);
                    }
                }

                public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language)
                {
                    return Task.CompletedTask;
                }
            }
        }
        """;

    /// <summary><see cref="Kept"/> after the rewrite.</summary>
    private const string Rewritten = """
        using System;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Internal.Data;
        using Altinn.App.Core.Models;
        using Altinn.App.Models;
        using Altinn.Platform.Storage.Interface.Models;

        namespace Altinn.App.logic
        {
            public class PaymentProcessor : IDataProcessor
            {
                private readonly IDataClient _Data;

                public PaymentProcessor(IDataClient Data)
                {
                    _Data = Data;
                }

                public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
                {
                    if (data is model form)
                    {
                        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                    }
                }

                public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language)
                {
                    return Task.CompletedTask;
                }
            }
        }
        """;

    /// <summary>A line break and the indentation of a statement in the block <see cref="Kept"/>'s run is in.</summary>
    private const string Line = "\n                ";

    /// <summary>A line break and the indentation of a statement in a block nested in that one.</summary>
    private const string InnerLine = Line + "    ";

    private const string Declarations = "int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);";

    private const string Unlock =
        "DataElement dataElement = await _Data.UnlockDataElement(instanceIdentifier, (Guid)dataId);";

    private const string Update = "await _Data.Update(instance, dataElement);";

    private const string Write =
        "await _Data.UpdateData<model>(form, instanceIdentifier.InstanceGuid, typeof(model), \"ttd\", \"app\", instanceOwnerPartyId, (Guid)dataId);";

    private const string Relock = "dataElement = await _Data.LockDataElement(instanceIdentifier, (Guid)dataId);";

    private const string Run = Unlock + Line + Update + Line + Write + Line + Relock + Line + Update;

    /// <summary><see cref="Run"/> in a block nested in the one it is in.</summary>
    private const string InnerRun =
        Unlock + InnerLine + Update + InnerLine + Write + InnerLine + Relock + InnerLine + Update;

    /// <summary>A run on another element local, to put next to <see cref="Run"/>.</summary>
    private const string OtherRun =
        "DataElement element = await _Data.UnlockDataElement(instanceIdentifier, (Guid)dataId);"
        + InnerLine
        + "await _Data.Update(instance, element);"
        + InnerLine
        + "await _Data.UpdateFormData(instance, form, element);"
        + InnerLine
        + "element = await _Data.LockDataElement(instanceIdentifier, (Guid)dataId);"
        + InnerLine
        + "await _Data.Update(instance, element);";

    private const string Type = "public class PaymentProcessor : IDataProcessor";

    private const string ProcessDataRead =
        "public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)";

    private const string ProcessDataWrite =
        "public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language)";

    /// <summary>
    /// A base class implementing <c>IDataProcessor</c>, its <c>ProcessDataRead</c> <paramref name="modifier"/>.
    /// </summary>
    private static string BaseProcessor(string modifier) =>
        $$"""
            public class PaymentProcessorBase : IDataProcessor
                {
                    public {{modifier}}Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language) => Task.CompletedTask;

                    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language) => Task.CompletedTask;
                }

                public class PaymentProcessor : PaymentProcessorBase
            """;

    /// <summary><see cref="Kept"/> with the run replaced by <paramref name="run"/>.</summary>
    private static string WithRun(string run) => Replace(Kept, Run, run);

    /// <summary><see cref="Kept"/> with <paramref name="statement"/> before the run.</summary>
    private static string WithBefore(string statement) => Replace(Kept, Declarations, Declarations + Line + statement);

    public static TheoryData<string, Surface, string, string> RemovedRuns =>
        new()
        {
            { "New surface", Surface.New, Kept, Rewritten },
            { "Old surface", Surface.Old, Kept, Rewritten },
            {
                "Explicit interface implementation",
                Surface.New,
                Replace(Kept, "public async Task ProcessDataRead", "async Task IDataProcessor.ProcessDataRead"),
                Replace(Rewritten, "public async Task ProcessDataRead", "async Task IDataProcessor.ProcessDataRead")
            },
            {
                "Parameters with other names",
                Surface.New,
                WithRenamedParameters(Kept),
                WithRenamedParameters(Rewritten)
            },
            {
                "Named arguments out of order, new surface",
                Surface.New,
                Replace(Kept, "UnlockDataElement(instanceIdentifier, (Guid)dataId)", NamedArguments),
                Rewritten
            },
            {
                "UpdateFormData with the form",
                Surface.New,
                Replace(Kept, Write, "await _Data.UpdateFormData(instance, form, dataElement);"),
                Rewritten
            },
            {
                "UpdateData with the data parameter itself",
                Surface.New,
                Replace(Kept, "UpdateData<model>(form,", "UpdateData<object>(data,"),
                Rewritten
            },
        };

    /// <summary><paramref name="text"/> with <c>ProcessDataRead</c>'s parameters renamed, and their uses.</summary>
    private static string WithRenamedParameters(string text) =>
        Replace(
                text,
                "ProcessDataRead(Instance instance, Guid? dataId, object data, string language)",
                "ProcessDataRead(Instance current, Guid? id, object formData, string language)"
            )
            .Replace("data is model form", "formData is model form", StringComparison.Ordinal)
            .Replace("(Guid)dataId", "(Guid)id", StringComparison.Ordinal)
            .Replace("(instance)", "(current)", StringComparison.Ordinal)
            .Replace("(instance.", "(current.", StringComparison.Ordinal)
            .Replace("(instance,", "(current,", StringComparison.Ordinal);

    private const string NamedArguments =
        "UnlockDataElement(dataGuid: (Guid)dataId, instanceIdentifier: instanceIdentifier)";

    [Theory]
    [MemberData(nameof(RemovedRuns))]
    public void RemovesTheRun(string label, Surface surface, string source, string rewritten)
    {
        _ = label;
        var scanner = Scanner(surface, ProcessorPath, source);

        var result = Apply(scanner);

        Assert.Equal(rewritten, _app.Read(ProcessorPath));
        Assert.Equal([Warning(Message(ProcessorPath, LineOf(source, "UnlockDataElement(")))], result.Messages);
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, Stub(surface)));
    }

    [Fact]
    public void TheKnownScenarioMigrationRunsThisScenario()
    {
        var scanner = Scanner(Surface.New, ProcessorPath, Kept);

        var result = new KnownScenarioMigration(scanner, AppFolder).Migrate();

        Assert.Equal([Warning(Message(ProcessorPath, LineOf(Kept, Unlock)))], result.Messages);
        Assert.Equal(Rewritten, _app.Read(ProcessorPath));
    }

    /// <summary>
    /// An <c>IDataClient</c> with the members the fixtures call, declared by the app in <paramref name="ns"/>.
    /// </summary>
    private static string AppDataClient(string ns) =>
        $$"""
            namespace {{ns}}
            {
                using System;
                using System.Threading.Tasks;
                using Altinn.App.Core.Models;
                using Altinn.Platform.Storage.Interface.Models;

                public interface IDataClient
                {
                    Task<DataElement> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId);
                    Task<DataElement> Update(Instance instance, DataElement dataElement);
                    Task<DataElement> LockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid);
                    Task<DataElement> UnlockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid);
                }
            }


            """;

    /// <summary>An <c>IDataProcessor</c> declared by the app under the SDK's name.</summary>
    private const string AppDataProcessor = """
        namespace Altinn.App.Core.Features
        {
            using System;
            using System.Threading.Tasks;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IDataProcessor
            {
                Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language);
                Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language);
            }
        }


        """;

    private const string LockDeclares =
        "DataElement locked = await _Data.LockDataElement(instanceIdentifier, (Guid)dataId);";

    public static TheoryData<string, string> KeptRuns =>
        new()
        {
            {
                "Another element unlocked",
                Replace(
                    Kept,
                    "UnlockDataElement(instanceIdentifier, (Guid)dataId)",
                    "UnlockDataElement(instanceIdentifier, Guid.Empty)"
                )
            },
            {
                "Another element written",
                Replace(Kept, "instanceOwnerPartyId, (Guid)dataId);", "instanceOwnerPartyId, Guid.Empty);")
            },
            {
                "Another element written by UpdateFormData",
                Replace(Kept, Write, "await _Data.UpdateFormData(instance, form, instance.Data[0]);")
            },
            {
                "Another element locked",
                Replace(
                    Kept,
                    "LockDataElement(instanceIdentifier, (Guid)dataId)",
                    "LockDataElement(instanceIdentifier, Guid.Empty)"
                )
            },
            {
                "Another element updated",
                WithRun(
                    Unlock
                        + Line
                        + "await _Data.Update(instance, instance.Data[0]);"
                        + Line
                        + Write
                        + Line
                        + Relock
                        + Line
                        + Update
                )
            },
            {
                "Another parameter as the id",
                Replace(
                    Kept,
                    "UnlockDataElement(instanceIdentifier, (Guid)dataId)",
                    "UnlockDataElement(instanceIdentifier, (Guid)data)"
                )
            },
            {
                "Another instance updated",
                WithRun(
                    Unlock
                        + Line
                        + "await _Data.Update(null, dataElement);"
                        + Line
                        + Write
                        + Line
                        + Relock
                        + Line
                        + Update
                )
            },
            {
                "Another instance written by UpdateFormData",
                Replace(Kept, Write, "await _Data.UpdateFormData(null, form, dataElement);")
            },
            {
                "Unlock declares two locals",
                WithRun(
                    Replace(
                        Run,
                        Unlock,
                        "DataElement dataElement = await _Data.UnlockDataElement(instanceIdentifier, (Guid)dataId), spare = null;"
                    )
                        + Line
                        + "string spareId = spare?.Id;"
                )
            },
            {
                "Update declares a local used later",
                WithRun(
                    Unlock
                        + Line
                        + "DataElement updated = await _Data.Update(instance, dataElement);"
                        + Line
                        + Write
                        + Line
                        + Relock
                        + Line
                        + Update
                        + Line
                        + "string updatedId = updated.Id;"
                )
            },
            {
                "Update assigns a local",
                Replace(
                    WithBefore("DataElement updated = null;"),
                    Unlock + Line + Update,
                    Unlock + Line + "updated = await _Data.Update(instance, dataElement);"
                )
            },
            { "Write declares a local", Replace(Kept, Write, "DataElement saved = " + Write) },
            { "Write assigns a local", Replace(WithBefore("DataElement saved = null;"), Write, "saved = " + Write) },
            {
                "Lock declares a local used later",
                WithRun(
                    Unlock
                        + Line
                        + Update
                        + Line
                        + Write
                        + Line
                        + LockDeclares
                        + Line
                        + Update
                        + Line
                        + "string lockedId = locked.Id;"
                )
            },
            {
                "Lock assigns another local",
                Replace(
                    WithBefore("DataElement locked = null;"),
                    Relock,
                    "locked = await _Data.LockDataElement(instanceIdentifier, (Guid)dataId);"
                )
            },
            {
                "Another statement between unlock and write",
                Replace(Kept, Unlock, Unlock + Line + "int attempts = 1;")
            },
            { "Two writes", Replace(Kept, Write, Write + Line + Write) },
            { "No lock", WithRun(Unlock + Line + Update + Line + Write + Line + Update) },
            {
                "Another object written",
                Replace(Kept, "UpdateData<model>(form,", "UpdateData<object>(instanceIdentifier,")
            },
            { "Another parameter written", Replace(Kept, "UpdateData<model>(form,", "UpdateData<Instance>(instance,") },
            {
                "A new object written by UpdateFormData",
                Replace(Kept, Write, "await _Data.UpdateFormData(instance, new model(), dataElement);")
            },
            {
                "A type written by UpdateData",
                Replace(Kept, "UpdateData<model>(form,", "UpdateData<Type>(typeof(model),")
            },
            {
                "A pattern variable on something else written",
                Replace(
                    Replace(
                        Kept,
                        "if (data is model form)",
                        "if (data is model form && (object)language is model copy)"
                    ),
                    "UpdateData<model>(form,",
                    "UpdateData<model>(copy,"
                )
            },
            {
                "The form converted by a user-defined operator",
                Replace(Kept, "UpdateData<model>(form,", "UpdateData<Other>((Other)form,")
            },
            { "Element used after the run", WithRun(Run + Line + "string id = dataElement.Id;") },
            { "Form assigned", WithBefore("form = new model();") },
            { "Form assigned in parentheses", WithBefore("(form) = new model();") },
            { "Form post-incremented", WithBefore("form++;") },
            { "Form pre-incremented", WithBefore("++form;") },
            { "Form post-decremented", WithBefore("form--;") },
            { "Form pre-decremented", WithBefore("--form;") },
            { "Form deconstructed into", WithBefore("(form, var count) = (new model(), 1);") },
            { "Form passed by ref", WithBefore("Forms.Reset(ref form);") },
            { "Form passed as out", WithBefore("Forms.TryCreate(out form);") },
            { "Form taken by ref", WithBefore("{ ref model alias = ref form; alias = new model(); }") },
            {
                "Data parameter assigned",
                Replace(Kept, "if (data is model form)", "data = new model();\n            if (data is model form)")
            },
            {
                "Id parameter assigned",
                Replace(Kept, "if (data is model form)", "dataId = Guid.Empty;\n            if (data is model form)")
            },
            {
                "Call in an argument",
                Replace(
                    Kept,
                    "instanceOwnerPartyId, (Guid)dataId);",
                    "int.Parse(instance.InstanceOwner.PartyId), (Guid)dataId);"
                )
            },
            {
                "Dynamic call in an argument",
                Replace(Kept, "\"ttd\", \"app\",", "(string)((dynamic)instance).GetOrg(), \"app\",")
            },
            { "Interpolated string in an argument", Replace(Kept, "\"ttd\", \"app\",", "$\"{form}\", \"app\",") },
            {
                "Null-coalescing throw in an argument",
                Replace(Kept, "\"ttd\", \"app\",", "(string)null ?? throw null, \"app\",")
            },
            {
                "Uncalled lambda in an argument",
                Replace(Kept, "\"ttd\", \"app\",", "((Func<string>)(() => \"ttd\")).Method.Name, \"app\",")
            },
            {
                "Object created in an argument",
                Replace(
                    Kept,
                    "UnlockDataElement(instanceIdentifier,",
                    "UnlockDataElement(new InstanceIdentifier(instance),"
                )
            },
            {
                "Object created dynamically in an argument",
                Replace(
                    Kept,
                    "UnlockDataElement(instanceIdentifier,",
                    "UnlockDataElement(new InstanceIdentifier((dynamic)instance),"
                )
            },
            {
                "Assignment in an argument",
                Replace(Kept, "instanceOwnerPartyId, (Guid)dataId);", "instanceOwnerPartyId = 1, (Guid)dataId);")
            },
            {
                "Increment in an argument",
                Replace(Kept, "instanceOwnerPartyId, (Guid)dataId);", "instanceOwnerPartyId++, (Guid)dataId);")
            },
            {
                "Await in an argument",
                Replace(
                    WithBefore("Task<int> partyId = Task.FromResult(instanceOwnerPartyId);"),
                    "instanceOwnerPartyId, (Guid)dataId);",
                    "await partyId, (Guid)dataId);"
                )
            },
            {
                "User-defined conversion in an argument",
                Replace(Kept, "instanceOwnerPartyId, (Guid)dataId);", "(int)form, (Guid)dataId);")
            },
            {
                "User-defined binary operator in an argument",
                Replace(Kept, "instanceOwnerPartyId, (Guid)dataId);", "form + instanceOwnerPartyId, (Guid)dataId);")
            },
            {
                "User-defined unary operator in an argument",
                Replace(Kept, "instanceOwnerPartyId, (Guid)dataId);", "-form, (Guid)dataId);")
            },
            {
                "The run in ProcessDataWrite",
                Replace(
                    Replace(
                        Kept,
                        ProcessDataWrite,
                        "public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)"
                    ),
                    ProcessDataRead,
                    "public async Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language)"
                )
            },
            { "Class not implementing IDataProcessor", Replace(Kept, Type, "public class PaymentProcessor") },
            {
                "Method hiding the implementation with new",
                Replace(Replace(Kept, Type, BaseProcessor("")), "public async", "public new async")
            },
            {
                "App interface under IDataProcessor's name",
                Replace(Kept, "namespace Altinn.App.logic\n", AppDataProcessor + "namespace Altinn.App.logic\n")
            },
            {
                "The run in a helper ProcessDataRead calls",
                WithRun(
                    "await Save(instance, dataId, form, instanceIdentifier, instanceOwnerPartyId);\n            }\n        }\n\n"
                        + "        private async Task Save(Instance instance, Guid? dataId, model form, InstanceIdentifier instanceIdentifier, int instanceOwnerPartyId)\n"
                        + "        {\n            {"
                        + Line
                        + Run
                )
            },
            {
                "The run in a lambda",
                WithRun(
                    "Func<Task> save = async () =>"
                        + Line
                        + "{"
                        + InnerLine
                        + InnerRun
                        + Line
                        + "};"
                        + Line
                        + "await save();"
                )
            },
            {
                "The run in a local function",
                WithRun("await Save();" + Line + "async Task Save()" + Line + "{" + InnerLine + InnerRun + Line + "}")
            },
            {
                "Calls bound to an app interface of another namespace",
                Replace(
                    Replace(Kept, "using Altinn.App.Core.Internal.Data;", "using Altinn.App.logic.Storage;"),
                    "namespace Altinn.App.logic\n",
                    AppDataClient("Altinn.App.logic.Storage") + "namespace Altinn.App.logic\n"
                )
            },
            {
                "Calls bound to an app interface under IDataClient's name",
                Replace(
                    Kept,
                    "namespace Altinn.App.logic\n",
                    AppDataClient("Altinn.App.Core.Internal.Data") + "namespace Altinn.App.logic\n"
                )
            },
            { "Comment above the unlock", WithRun("// Unlock the form to save the receipt" + Line + Run) },
            { "Comment in the run", Replace(Kept, Write, "// Save the receipt" + Line + Write) },
            { "Comment after the last statement", WithRun(Run + " // Locked again") },
            {
                "Multi-line comment in an argument list",
                Replace(Kept, "UpdateData<model>(form,", "UpdateData<model>(/* the receipt */ form,")
            },
            {
                "Documentation comment in the run",
                Replace(Kept, Write, "/// <summary>Saves the receipt.</summary>" + Line + Write)
            },
            {
                "Multi-line documentation comment in an argument list",
                Replace(Kept, "UpdateData<model>(form,", "UpdateData<model>(/** the receipt */ form,")
            },
            { "Region in the run", Replace(Kept, Write, "#region Save" + Line + Write + "\n#endregion") },
            {
                "Code excluded by #if elsewhere in the method",
                Replace(
                    Kept,
                    "if (data is model form)",
                    "#if DEBUG\n            Console.WriteLine(dataId);\n#endif\n            if (data is model form)"
                )
            },
        };

    [Theory]
    [MemberData(nameof(KeptRuns))]
    public void KeepsTheRun(string label, string source)
    {
        _ = label;
        var scanner = Scanner(Surface.New, ProcessorPath, source);

        var result = Apply(scanner);

        Assert.Empty(result.Messages);
        Assert.Equal(source, _app.Read(ProcessorPath));
    }

    [Fact]
    public void KeepsTheRun_InAnImplementationOfAnotherAltinnInterfaceOfTheSameName()
    {
        // Generic over the instance only so that this stub needs no reference to the other.
        var api = SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Api",
            """
            namespace Altinn.App.Api.Models
            {
                public interface IDataProcessor<TInstance>
                {
                    System.Threading.Tasks.Task ProcessDataRead(
                        TInstance instance,
                        System.Guid? dataId,
                        object data,
                        string language
                    );
                }
            }
            """
        );
        var source = Replace(
            Replace(Kept, Type, "public class PaymentProcessor : Altinn.App.Api.Models.IDataProcessor<Instance>"),
            ProcessDataWrite,
            "public Task Write(Instance instance, Guid? dataId, object data, object previousData, string language)"
        );
        _app.Write("Models.cs", Models);
        _app.Write(ProcessorPath, source);

        var result = Apply(SemanticScannerFactory.CreateScanner(AppFolder, Stub(Surface.New), api));

        Assert.Empty(result.Messages);
        Assert.Equal(source, _app.Read(ProcessorPath));
    }

    // --- Several runs ----------------------------------------------------------------------------

    private const string Block = "if (instance.Process != null)" + Line + "{";

    [Fact]
    public void RemovesEveryRunInAFile_ReportingTheLinesBeforeTheRewrite()
    {
        // The inner run is first in the file, but its block is searched after the outer one.
        var source = WithRun(Block + InnerLine + OtherRun + Line + "}" + "\n" + Line + Run);
        var scanner = Scanner(Surface.New, ProcessorPath, source);

        var result = Apply(scanner);

        Assert.Equal(
            Replace(Rewritten, Declarations, Declarations + "\n" + Line + Block + Line + "}"),
            _app.Read(ProcessorPath)
        );
        Assert.Equal(
            [
                Warning(Message(ProcessorPath, LineOf(source, "DataElement element ="))),
                Warning(Message(ProcessorPath, LineOf(source, Unlock))),
            ],
            result.Messages
        );
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, Stub(Surface.New)));
    }

    [Fact]
    public void ReportsTheFilesInPathOrder()
    {
        // Written in ascending order: tmpfs lists the newest file first, and ext4 lists in hash order, which sorts
        // five files only once in 120 runs. Logic/Gamma.cs sorts before LogicEpsilon.cs because the order compares
        // paths with '/', which a Windows path has as '\'.
        string[] paths = ["Alpha.cs", "Beta.cs", "Delta.cs", Path.Combine("Logic", "Gamma.cs"), "LogicEpsilon.cs"];
        _app.Write("Models.cs", Models);
        foreach (var path in paths)
        {
            _app.Write(path, Replace(Kept, "PaymentProcessor", Path.GetFileNameWithoutExtension(path)));
        }

        var result = Apply(SemanticScannerFactory.CreateScanner(AppFolder, Stub(Surface.New)));

        Assert.Equal([.. paths.Select(static path => Warning(Message(path, LineOf(Kept, Unlock))))], result.Messages);
        foreach (var path in paths)
        {
            Assert.Equal(
                Replace(Rewritten, "PaymentProcessor", Path.GetFileNameWithoutExtension(path)),
                _app.Read(path)
            );
        }
    }

    // --- Layout after the removal ----------------------------------------------------------------

    [Fact]
    public void KeepsOneBlankLineWhereTheRunStoodBetweenBlankLines()
    {
        const string following = "\n" + Line + "Console.WriteLine(instanceOwnerPartyId);";
        var scanner = Scanner(Surface.New, ProcessorPath, WithRun(Run + following));

        Apply(scanner);

        Assert.Equal(Replace(Rewritten, Declarations, Declarations + following), _app.Read(ProcessorPath));
    }

    // --- Without a compilation, and once more -----------------------------------------------------

    [Fact]
    public void WithoutSemanticModels_ChangesNothing()
    {
        _app.Write("Models.cs", Models);
        _app.Write(ProcessorPath, Kept);

        var result = Apply(new CSharpSourceScanner(AppFolder));

        Assert.Empty(result.Messages);
        Assert.Equal(Kept, _app.Read(ProcessorPath));
    }

    [Fact]
    public void RunningAgain_FindsNothing()
    {
        var scanner = Scanner(Surface.New, ProcessorPath, Kept);
        Assert.Single(Apply(scanner).Messages);

        Assert.Empty(Apply(scanner).Messages);
        Assert.Empty(Apply(SemanticScannerFactory.CreateScanner(AppFolder, Stub(Surface.New))).Messages);
        Assert.Equal(Rewritten, _app.Read(ProcessorPath));
    }
}
