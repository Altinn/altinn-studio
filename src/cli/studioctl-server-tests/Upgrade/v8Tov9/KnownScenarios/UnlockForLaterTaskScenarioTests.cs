using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;
using Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

namespace Studioctl.Tests.Upgrade.v8Tov9.KnownScenarios;

public sealed class UnlockForLaterTaskScenarioTests : IDisposable
{
    private const string HookPath = "helpers/ProcessTaskStart.cs";
    private const string ProgramPath = "Program.cs";
    private const string NeighbourPath = "helpers/DataProcessor.cs";
    private const string MetadataPath = "config/applicationmetadata.json";
    private const string ProcessPath = "config/process/process.bpmn";
    private const string Registration = "services.AddTransient<IProcessTaskStart, ProcessTaskStart>();";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    // --- The app the scenario was found in: tra/egenerklaering ---------------------------------------

    /// <summary>The hook's members after its constructor, as tra/egenerklaering has them.</summary>
    private const string TraMembers = """
                public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill) {
                    switch (taskId) {
                        case "Task_3":
                            await ProcessTask3Init(instance);
                            break;
                    }
                }

                // Function to unlock datamodel TR_Egenerklaering_M again in Task_3 so that Revisor can do changes
                public async Task ProcessTask3Init(Instance instance) {
                    var egenerklaering = instance.Data.Where(d => d.DataType == "TR_Egenerklaering_M");
                    foreach (var e in egenerklaering) {
                        await _dataClient.UnlockDataElement(new Core.Models.InstanceIdentifier(instance), Guid.Parse(e.Id));
                    }
                }
        """;

    private const string TraConstructor = """
                private readonly IDataClient _dataClient;

                public ProcessTaskStart(IDataClient dataClient)
                {
                    _dataClient = dataClient;
                }
        """;

    /// <summary>The hook file, with <paramref name="members"/> after the field and constructor.</summary>
    private static string Hook(
        string members = TraMembers,
        string declaration = "public class ProcessTaskStart : IProcessTaskStart",
        string constructor = TraConstructor,
        string before = "",
        string after = ""
    ) =>
        $$"""
            using System;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.Platform.Storage.Interface.Models;
            using System.Collections.Generic;
            using Altinn.App.Core.Internal.Data;
            using System.Linq;

            #nullable enable
            {{before}}
            namespace Altinn.App.helpers
            {
                {{declaration}}
                {
            {{constructor}}

            {{members}}
                }
            {{after}}
            }
            """;

    private static string Program(params string[] registrations) =>
        """
            using Altinn.App.Core.Features;
            using Altinn.App.helpers;
            using Microsoft.Extensions.DependencyInjection;

            void RegisterCustomAppServices(IServiceCollection services)
            {
                // Register your apps custom service implementations here.
                services.AddTransient<DataProcessor>();

            """
        + string.Concat(registrations.Select(static registration => $"    {registration}\n"))
        + """
            }

            """;

    private const string Neighbour = """
        namespace Altinn.App.helpers
        {
            public class DataProcessor { }
        }
        """;

    /// <summary>applicationmetadata.json with these properties on the form after its <c>appLogic</c>.</summary>
    private static string Metadata(
        string form =
            """
                      "taskId": "Task_1",
                      "maxCount": 1,
                      "minCount": 1,
                      "enablePdfCreation": false,
                """,
        string appLogic =
            """
                      "appLogic": {
                        "autoCreate": true,
                        "classRef": "Altinn.App.Models.TR_Egenerklaering_M"
                      },
                """
    ) =>
        $$"""
            {
              "id": "tra/egenerklaering",
              "org": "tra",
              "dataTypes": [
                {
                  "id": "ref-data-as-pdf",
                  "allowedContentTypes": [
                    "application/pdf"
                  ],
                  "maxCount": 0,
                  "minCount": 0,
                  "enablePdfCreation": true
                },
                {
                  "id": "TR_Egenerklaering_M",
                  "allowedContentTypes": [
                    "application/xml"
                  ],
            {{appLogic}}
            {{form}}
                  "enableFileScan": false
                },
                {
                  "id": "RevisorsUttalelse",
                  "allowedContentTypes": [
                    "application/xml"
                  ],
                  "appLogic": {
                    "autoCreate": true,
                    "classRef": "Altinn.App.Models.RevisorsUttalelse"
                  },
                  "taskId": "Task_3",
                  "enablePdfCreation": true
                }
              ]
            }
            """;

    /// <summary>process.bpmn with data tasks Task_1 and Task_2, and Task_3 of type <paramref name="laterTaskType"/>.</summary>
    private static string Process(string? laterTaskType = "data", bool withLaterTask = true)
    {
        string TaskElement(string id, string? type) =>
            type is null
                ? $"    <bpmn2:task id=\"{id}\" />\n"
                : $"    <bpmn2:task id=\"{id}\">\n      <bpmn2:extensionElements><altinn:taskExtension>"
                    + $"<altinn:taskType>{type}</altinn:taskType></altinn:taskExtension></bpmn2:extensionElements>\n"
                    + "    </bpmn2:task>\n";
        return $$"""
            <?xml version="1.0" encoding="utf-8"?>
            <bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
              <bpmn2:process id="Process" isExecutable="false">
            {{TaskElement("Task_1", "data")}}{{TaskElement("Task_2", "data")}}{{(
                withLaterTask ? TaskElement("Task_3", laterTaskType) : ""
            )}}  </bpmn2:process>
            </bpmn2:definitions>
            """;
    }

    /// <summary>Writes the app, with the parts given replacing tra/egenerklaering's, and scans it.</summary>
    private CSharpSourceScanner Scanner(
        string? hook = null,
        string? program = null,
        string? neighbour = null,
        string? metadata = null,
        string? process = null,
        params (string Path, string Source)[] others
    )
    {
        _app.Write(HookPath, hook ?? Hook());
        _app.Write(ProgramPath, program ?? Program(Registration));
        _app.Write(NeighbourPath, neighbour ?? Neighbour);
        _app.Write(MetadataPath, metadata ?? Metadata());
        _app.Write(ProcessPath, process ?? Process());
        foreach (var (path, source) in others)
        {
            _app.Write(path, source);
        }

        return SemanticScannerFactory.CreateScanner(AppFolder, StorageCallStubs.V8);
    }

    private MigrationResult Apply(CSharpSourceScanner scanner) =>
        new UnlockForLaterTaskScenario().Apply(scanner, AppFolder);

    /// <summary>The app's files and their contents.</summary>
    private Dictionary<string, string> Files() =>
        Directory
            .EnumerateFiles(AppFolder, "*", SearchOption.AllDirectories)
            .ToDictionary(path => Path.GetRelativePath(AppFolder, path), File.ReadAllText);

    private static string BoundMetadata() =>
        Metadata(
            form: """
                  "taskIds": ["Task_1", "Task_3"],
                  "maxCount": 1,
                  "minCount": 1,
                  "enablePdfCreation": false,
            """
        );

    private static List<UpgradeMessage> BoundMessages() =>
        [
            new(
                "Bound data type TR_Egenerklaering_M to Task_3 as well as Task_1 in config/applicationmetadata.json: v9 "
                    + "unlocks the data of a type bound to a task when the task starts, as the hook did.",
                UpgradeMessageStatus.Warning
            ),
            new(
                $"Deleted {HookPath}, whose only work was that unlock, and its registration in "
                    + $"{ProgramPath}:{LineOf(Program(Registration), Registration)}.",
                UpgradeMessageStatus.Ok
            ),
        ];

    private static int LineOf(string source, string text) => ProcessHookStubs.LineOf(source, text);

    private static UpgradeMessage Refused(string task, string pdf = "") =>
        new(
            $"{HookPath}:{LineOf(Hook(), "public async Task Start(")}: in v8 this hook unlocked data type "
                + $"TR_Egenerklaering_M when {task} started, so that it could be changed there. v9 keeps a data type "
                + "locked outside its taskIds: to keep it editable there, add Task_3 to its taskIds in "
                + $"config/applicationmetadata.json, which also validates, finalizes and locks it in that task{pdf}; "
                + "otherwise delete the handler.",
            UpgradeMessageStatus.Todo
        );

    [Fact]
    public void ReportsATodoAtTheHandlerAndLeavesTheAppAlone_InTheAppItWasSeenIn()
    {
        var scanner = Scanner(process: Process("signing"));
        var before = Files();

        var result = new KnownScenarioMigration(scanner, AppFolder).Migrate();

        Assert.Equal([Refused("signing task Task_3")], result.Messages);
        Assert.Equal(before, Files());
        Assert.Contains(
            StorageCallStubs.Port(AppFolder).Messages,
            static message =>
                message.Status == UpgradeMessageStatus.Todo
                && message.Text.StartsWith(
                    $"{HookPath}:{LineOf(Hook(), "UnlockDataElement(")}:",
                    StringComparison.Ordinal
                )
        );
    }

    /// <summary>Later tasks that are not data tasks, as the to-do names them.</summary>
    [Theory]
    [InlineData("payment", "payment task Task_3")]
    [InlineData("confirmation", "confirmation task Task_3")]
    [InlineData("pdf", "pdf task Task_3")]
    [InlineData(null, "task Task_3")]
    public void ReportsATodoAndLeavesTheAppAlone_WhenTheLaterTaskIsNotADataTask(string? taskType, string task)
    {
        var scanner = Scanner(process: Process(taskType));
        var before = Files();

        var result = Apply(scanner);

        Assert.Equal([Refused(task)], result.Messages);
        Assert.Equal(before, Files());
    }

    /// <summary>The app reads the file ignoring case, so the PDF check must too.</summary>
    [Theory]
    [InlineData("appLogic", "classRef")]
    [InlineData("AppLogic", "ClassRef")]
    public void TheTodoSaysTheBindingWouldAddAPdf_WhenItWould(string appLogic, string classRef)
    {
        var scanner = Scanner(
            metadata: Metadata(
                form: "      \"taskId\": \"Task_1\",\n      \"enablePdfCreation\": true,",
                appLogic: $"      \"{appLogic}\": {{ \"autoCreate\": true, \"{classRef}\": \"Altinn.App.Models.TR_Egenerklaering_M\" }},"
            ),
            process: Process("signing")
        );

        var result = Apply(scanner);

        Assert.Equal([Refused("signing task Task_3", " and creates a PDF of it when the task ends")], result.Messages);
    }

    [Fact]
    public void BindsTheFormToTheLaterTaskAndDeletesTheHook_WhenTheLaterTaskIsADataTask()
    {
        var scanner = Scanner();

        var result = new KnownScenarioMigration(scanner, AppFolder).Migrate();

        Assert.Equal(BoundMessages(), result.Messages);
        Assert.Equal(BoundMetadata(), _app.Read(MetadataPath));
        Assert.False(File.Exists(Path.Combine(AppFolder, HookPath)));
        Assert.Equal(Program(), _app.Read(ProgramPath));
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, StorageCallStubs.V9));
    }

    /// <summary>A hook that differs from the scenario in one respect each, and the app around it.</summary>
    public static TheoryData<string, string, string?, string?> UnmatchedCode =>
        new()
        {
            {
                "the branch does more",
                Hook(
                    TraMembers.Replace(
                        "await ProcessTask3Init(instance);",
                        "await ProcessTask3Init(instance);\n                    await Task.Delay(1);"
                    )
                ),
                null,
                null
            },
            {
                "Start handles a second task",
                Hook(
                    TraMembers.Replace(
                        "case \"Task_3\":",
                        "case \"Task_2\":\n                        break;\n                    case \"Task_3\":"
                    )
                ),
                null,
                null
            },
            {
                "the branch awaits something else",
                Hook(TraMembers.Replace("await ProcessTask3Init(instance);", "await Task.FromResult(instance);")),
                null,
                null
            },
            {
                "the switch is on something else",
                Hook(TraMembers.Replace("switch (taskId)", "switch (instance.Id)")),
                null,
                null
            },
            {
                "the helper is passed something else",
                Hook(
                    TraMembers.Replace("await ProcessTask3Init(instance);", "await ProcessTask3Init(new Instance());")
                ),
                null,
                null
            },
            {
                "the loop filters on something else",
                Hook(TraMembers.Replace("d.DataType == ", "d.Id == ")),
                null,
                null
            },
            { "the loop compares otherwise", Hook(TraMembers.Replace("d.DataType == ", "d.DataType != ")), null, null },
            {
                "the loop goes over another instance's data",
                Hook(TraMembers.Replace("instance.Data.Where", "new Instance().Data.Where")),
                null,
                null
            },
            { "the loop locks", Hook(TraMembers.Replace("UnlockDataElement", "LockDataElement")), null, null },
            {
                "the loop filters with another Where",
                Hook(),
                null,
                "using System;\nusing System.Collections.Generic;\nusing Altinn.Platform.Storage.Interface.Models;\n\n"
                    + "namespace Altinn.App.helpers\n{\n    public class DataProcessor { }\n\n"
                    + "    public static class Filters\n    {\n"
                    + "        public static IEnumerable<DataElement> Where(this List<DataElement> elements, Func<DataElement, bool> predicate) => elements;\n"
                    + "    }\n}\n"
            },
            {
                "the unlock parses another property",
                Hook(TraMembers.Replace("Guid.Parse(e.Id)", "Guid.Parse(e.InstanceGuid)")),
                null,
                null
            },
            {
                "the loop goes over something else",
                Hook(
                    TraMembers.Replace(
                        ".Where(d => d.DataType == \"TR_Egenerklaering_M\")",
                        ".Where(d => d.DataType == \"TR_Egenerklaering_M\").Take(1)"
                    )
                ),
                null,
                null
            },
            {
                "the loop does more",
                Hook(
                    TraMembers.Replace(
                        "Guid.Parse(e.Id));",
                        "Guid.Parse(e.Id));\n                    e.Locked = false;"
                    )
                ),
                null,
                null
            },
            {
                "the unlock is of another element",
                Hook(TraMembers.Replace("Guid.Parse(e.Id)", "Guid.Parse(instance.Id)")),
                null,
                null
            },
            {
                "the unlock is of another instance",
                Hook(
                    TraMembers.Replace(
                        "new Core.Models.InstanceIdentifier(instance)",
                        "new Core.Models.InstanceIdentifier(e.Id)"
                    )
                ),
                null,
                null
            },
            {
                "the unlock passes an authentication method",
                Hook(TraMembers.Replace("Guid.Parse(e.Id));", "Guid.Parse(e.Id), null);")),
                null,
                null
            },
            {
                "the unlock is on a static field",
                Hook(
                    TraMembers.Replace("_dataClient.UnlockDataElement", "_shared.UnlockDataElement"),
                    constructor: TraConstructor + "\n\n        private static IDataClient _shared;"
                ),
                null,
                null
            },
            {
                "the unlock is of the app's own instance identifier",
                Hook(TraMembers.Replace("new Core.Models.InstanceIdentifier(instance)", "new Identifier(instance)")),
                null,
                "using Altinn.Platform.Storage.Interface.Models;\n\nnamespace Altinn.App.helpers\n{\n    public class DataProcessor { }\n\n"
                    + "    public class Identifier(Instance instance) : Altinn.App.Core.Models.InstanceIdentifier(instance) { }\n}\n"
            },
            {
                "the unlock is on the app's own IDataClient",
                Hook(),
                null,
                "namespace Altinn.App.helpers\n{\n    public class DataProcessor { }\n}\n\n"
                    + "namespace Altinn.App.Core.Internal.Data\n{\n    public interface IDataClient\n    {\n"
                    + "        System.Threading.Tasks.Task<bool> UnlockDataElement(Altinn.App.Core.Models.InstanceIdentifier "
                    + "instanceIdentifier, System.Guid dataGuid);\n    }\n}\n"
            },
        };

    [Theory]
    [MemberData(nameof(UnmatchedCode))]
    public void LeavesTheAppAlone_WhenTheHookIsNotTheScenario(
        string because,
        string hook,
        string? program,
        string? neighbour
    )
    {
        var scanner = Scanner(hook, program, neighbour);
        var before = Files();

        var result = Apply(scanner);

        Assert.True(result.Messages.Count == 0, because);
        Assert.Equal(before, Files());
    }

    /// <summary>applicationmetadata.json and process.bpmn that do not let the form be bound to the later task.</summary>
    public static TheoryData<string, string, string?> UnmatchedConfiguration =>
        new()
        {
            {
                "the form is bound to that task already",
                Metadata(form: "      \"taskId\": \"Task_3\",\n      \"enablePdfCreation\": false,"),
                null
            },
            {
                "the form has taskIds",
                Metadata(
                    form: "      \"taskId\": \"Task_1\",\n      \"taskIds\": [\"Task_1\"],\n      \"enablePdfCreation\": false,"
                ),
                null
            },
            { "the form has no taskId", Metadata(form: "      \"enablePdfCreation\": false,"), null },
            {
                "the form's taskId is empty",
                Metadata(form: "      \"taskId\": \"\",\n      \"enablePdfCreation\": false,"),
                null
            },
            {
                "the form has two enablePdfCreation",
                Metadata(
                    form: "      \"taskId\": \"Task_1\",\n      \"enablePdfCreation\": false,\n      \"EnablePdfCreation\": false,"
                ),
                null
            },
            {
                "the form has two taskIds",
                Metadata(
                    form: "      \"taskId\": \"Task_1\",\n      \"TaskId\": \"Task_1\",\n      \"enablePdfCreation\": false,"
                ),
                null
            },
            { "the task is not in the process", Metadata(), Process(withLaterTask: false) },
        };

    [Theory]
    [MemberData(nameof(UnmatchedConfiguration))]
    public void LeavesTheAppAlone_WhenTheConfigurationDoesNotBindTheForm(
        string because,
        string metadata,
        string? process
    )
    {
        var scanner = Scanner(metadata: metadata, process: process);
        var before = Files();

        var result = Apply(scanner);

        Assert.True(result.Messages.Count == 0, because);
        Assert.Equal(before, Files());
    }

    [Theory]
    [InlineData(
        """
                  "taskId": "Task_1",
            """,
        """
                  "appLogic": {
                    "classRef": "Altinn.App.Models.TR_Egenerklaering_M"
                  },
            """
    )]
    [InlineData(
        """
                  "taskId": "Task_1",
                  "enablePdfCreation": true,
            """,
        ""
    )]
    public void BindsTheDataType_WhenTheBindingAddsNoPdf(string form, string appLogic)
    {
        var scanner = Scanner(metadata: Metadata(form, appLogic));

        var result = Apply(scanner);

        Assert.Equal(BoundMessages(), result.Messages);
        Assert.Equal(
            Metadata(form.Replace("\"taskId\": \"Task_1\"", "\"taskIds\": [\"Task_1\", \"Task_3\"]"), appLogic),
            _app.Read(MetadataPath)
        );
    }

    [Theory]
    [InlineData(
        """
                  "taskId": "Task_1",
                  "enablePdfCreation": true,
            """
    )]
    public void WarnsAndLeavesTheAppAlone_WhenTheBindingWouldAddAPdf(string form)
    {
        var scanner = Scanner(metadata: Metadata(form));
        var before = Files();

        var result = Apply(scanner);

        Assert.Equal(
            [
                new UpgradeMessage(
                    $"{HookPath}:{LineOf(Hook(), "UnlockDataElement(")}: unlocks data type TR_Egenerklaering_M when "
                        + "Task_3 starts, so that it can be changed there. Adding Task_3 to its taskIds in "
                        + "config/applicationmetadata.json would do that in v9, but the upgrade did not: it has PDF "
                        + "creation on, so the PDF step would then also create a PDF of it when that task ends, which v8 "
                        + "did not.",
                    UpgradeMessageStatus.Warning
                ),
            ],
            result.Messages
        );
        Assert.Equal(before, Files());
        Assert.Contains(
            StorageCallStubs.Port(AppFolder).Messages,
            static message =>
                message.Status == UpgradeMessageStatus.Todo
                && message.Text.StartsWith(
                    $"{HookPath}:{LineOf(Hook(), "UnlockDataElement(")}:",
                    StringComparison.Ordinal
                )
        );
    }

    [Fact]
    public void LeavesBothHooksAlone_WhenTwoUnlockTheSameDataType()
    {
        var second = Hook()
            .Replace("class ProcessTaskStart", "class SecondTaskStart")
            .Replace("public ProcessTaskStart(", "public SecondTaskStart(");
        var scanner = Scanner(
            program: Program(Registration, "services.AddTransient<IProcessTaskStart, SecondTaskStart>();"),
            others: ("helpers/SecondTaskStart.cs", second)
        );
        var before = Files();

        var result = Apply(scanner);

        Assert.Empty(result.Messages);
        Assert.Equal(before, Files());
    }
}
