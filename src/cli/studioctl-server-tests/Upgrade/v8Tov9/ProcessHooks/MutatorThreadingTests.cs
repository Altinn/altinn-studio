using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// H-HELPER: helpers only the transition calls get the mutator as a parameter; one that cannot, keeps its Storage
/// calls with a to-do.
/// </summary>
public sealed class MutatorThreadingTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> Rewrites =>
        new()
        {
            {
                // dmf/driftsplan App/logic/instance/Update.cs:12-18.
                "a static helper with the client and the instance gets the mutator for both (O2)",
                """
                    public static class Update
                    {
                        public static async Task UpdateInstance(IInstanceClient client, Instance instance, string periode)
                        {
                            var id = new InstanceIdentifier(instance);
                            await client.UpdatePresentationTexts(id.InstanceOwnerPartyId, id.InstanceGuid, new PresentationTexts { Texts = new Dictionary<string, string?> { { "periode", periode } } });
                        }
                    }

                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await Update.UpdateInstance(instanceClient, instance, "2026");
                        }
                    }
                    """,
                $$"""
                    public static class Update
                    {
                        public static async Task UpdateInstance({{IInstanceDataMutator}} dataMutator, string periode)
                        {
                            Instance instance = dataMutator.Instance;
                            var id = new InstanceIdentifier(instance);
                            dataMutator.SetPresentationText("periode", periode);
                        }
                    }

                    public class ProcessTaskEnd(IInstanceClient instanceClient) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            await Update.UpdateInstance(dataMutator, "2026");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // pat/patent ProcessTaskEnd.cs:144 UpdatePresentationFieldWithCaseNumber.
                "a helper without the instance gets the mutator first",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var instanceIdentifier = new InstanceIdentifier(instance);
                            await SetCaseNumber("123", instanceIdentifier);
                        }

                        private async Task SetCaseNumber(string caseNumber, InstanceIdentifier instanceIdentifier)
                        {
                            await instanceClient.UpdatePresentationTexts(instanceIdentifier.InstanceOwnerPartyId, instanceIdentifier.InstanceGuid, new PresentationTexts { Texts = new() { { "CaseNumber", caseNumber } } });
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var instanceIdentifier = new InstanceIdentifier(instance);
                            await SetCaseNumber(dataMutator, "123", instanceIdentifier);
                            return {{HandlerResult}}.Success();
                        }

                        private async Task SetCaseNumber({{IInstanceDataMutator}} dataMutator, string caseNumber, InstanceIdentifier instanceIdentifier)
                        {
                            dataMutator.SetPresentationText("CaseNumber", caseNumber);
                        }
                    }
                    """
            },
            {
                // dihe/motorferdsel App/logic/Services/DataModelService.cs:15-45.
                "an app interface and its implementation change together",
                """
                    public interface IDataModelService
                    {
                        Task UpdateDataModel<T>(T dataModel, string dataModelName, Instance instance);
                    }

                    public class DataModelService(IDataClient dataClient) : IDataModelService
                    {
                        public async Task UpdateDataModel<T>(T dataModel, string dataModelName, Instance instance)
                        {
                            var dataElement = instance.Data.First(data => data.DataType == dataModelName);
                            await dataClient.UpdateFormData(instance, dataModel!, dataElement);
                        }
                    }

                    public class Model { }

                    public class ProcessTaskEnd(IDataModelService dataModelService) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await dataModelService.UpdateDataModel(new Model(), "model", instance);
                        }
                    }
                    """,
                $$"""
                    public interface IDataModelService
                    {
                        Task UpdateDataModel<T>(T dataModel, string dataModelName, {{IInstanceDataMutator}} dataMutator);
                    }

                    public class DataModelService : IDataModelService
                    {
                        public async Task UpdateDataModel<T>(T dataModel, string dataModelName, {{IInstanceDataMutator}} dataMutator)
                        {
                            Instance instance = dataMutator.Instance;
                            var dataElement = instance.Data.First(data => data.DataType == dataModelName);
                            await dataMutator.ReplaceFormData(dataElement, dataModel!);
                        }
                    }

                    public class Model { }

                    public class ProcessTaskEnd(IDataModelService dataModelService) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            await dataModelService.UpdateDataModel(new Model(), "model", dataMutator);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // buf/fosterhjem-ep-skjema-person-b SigningTaskEnd.cs:20-40.
                "an injected client field still used elsewhere stays",
                """
                    public class ProcessTaskEnd : IProcessTaskEnd
                    {
                        private readonly IInstanceClient _instanceClient;

                        public ProcessTaskEnd(IInstanceClient instanceClient)
                        {
                            _instanceClient = instanceClient;
                        }

                        public async Task End(string taskId, Instance instance)
                        {
                            await _instanceClient.UpdateDataValue(instance, "k", "v");
                        }

                        public Task<Instance> Reload(Instance instance) => _instanceClient.GetInstance(instance);
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        private readonly IInstanceClient _instanceClient;

                        public ProcessTaskEnd(IInstanceClient instanceClient)
                        {
                            _instanceClient = instanceClient;
                        }

                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }

                        public Task<Instance> Reload(Instance instance) => _instanceClient.GetInstance(instance);
                    }
                    """
            },
            {
                "a client parameter of a hook the app also creates with new stays",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await instanceClient.UpdateDataValue(instance, "k", "v");
                        }
                    }

                    public static class Hooks
                    {
                        public static ProcessTaskEnd Create(IInstanceClient instanceClient) => new ProcessTaskEnd(instanceClient);
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }

                    public static class Hooks
                    {
                        public static ProcessTaskEnd Create(IInstanceClient instanceClient) => new ProcessTaskEnd(instanceClient);
                    }
                    """
            },
            {
                "an instance passed by name is passed as the mutator by name",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await SetIt(instance: instance, value: "x");
                        }

                        private async Task SetIt(string value, Instance instance)
                        {
                            await instanceClient.UpdateDataValue(instance, "k", value);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            await SetIt(dataMutator: dataMutator, value: "x");
                            return {{HandlerResult}}.Success();
                        }

                        private async Task SetIt(string value, {{IInstanceDataMutator}} dataMutator)
                        {
                            dataMutator.SetDataValue("k", value);
                        }
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(Rewrites))]
    public void TheMutator_ReachesTheHelpersAsAParameter(string label, string before, string after)
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Empty(result.Todos);
        AssertCompilesAgainstV9(AppFolder);
    }

    private const string LeftInAConstructedHelper =
        "is called from ProcessTaskEnd.End; it was left unchanged (it gets the instance or a Storage client through its "
        + "constructor (new FormDataHelper(instance, dataClient))). Give the process-hook path its own method that takes "
        + "IInstanceDataMutator.";

    // A read-modify-write, whose write back C-RF1 would delete, in a helper the hook creates with the instance (O4).
    private const string ReadModifyWriteInAConstructedHelper = """
        public class Skjema { public string? A { get; set; } }

        public class FormDataHelper(Instance instance, IDataClient dataClient)
        {
            public async Task Touch(DataElement el)
            {
                var model = await dataClient.GetFormData(instance, el);
                if (model is not Skjema s)
                    return;
                s.A = "x";
                await dataClient.UpdateFormData(instance, s, el);
            }
        }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                var helper = new FormDataHelper(instance, dataClient);
                await helper.Touch(instance.Data[0]);
            }
        }
        """;

    public static TheoryData<string, string, string[], string[]> Unthreadable =>
        new()
        {
            {
                // pat ×5 FillFieldsHelper (also from DataProcessor.cs:22,27).
                "a helper a data processor calls too keeps its calls, with a to-do",
                """
                    public class FillFieldsHelper(IInstanceClient instanceClient)
                    {
                        public async Task SetStatus(Instance instance) => await instanceClient.UpdateDataValue(instance, "status", "x");
                    }

                    public class ProcessTaskEnd(FillFieldsHelper helper) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance) => await helper.SetStatus(instance);
                    }

                    public class DataProcessor(FillFieldsHelper helper)
                    {
                        public async Task ProcessDataWrite(Instance instance) => await helper.SetStatus(instance);
                    }
                    """,
                [
                    "public async Task SetStatus(Instance instance) => await instanceClient.UpdateDataValue(instance, \"status\", \"x\");",
                ],
                [
                    "FillFieldsHelper.SetStatus writes to Storage with IInstanceClient.UpdateDataValue and is called both from ProcessTaskEnd.End and from DataProcessor.ProcessDataWrite, which do not run only in the process transition; it was left unchanged. Give the process-hook path its own method that takes IInstanceDataMutator.",
                ]
            },
            {
                // brg/virksomhetsregistrering flow steps (O5).
                "a helper used as a delegate keeps its calls, with a to-do",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            Func<Instance, Task> step = SetStatus;
                            await step(instance);
                        }

                        private async Task SetStatus(Instance instance) => await instanceClient.UpdateDataValue(instance, "status", "x");
                    }
                    """,
                [
                    "private async Task SetStatus(Instance instance) => await instanceClient.UpdateDataValue(instance, \"status\", \"x\");",
                ],
                [
                    "ProcessTaskEnd.SetStatus writes to Storage with IInstanceClient.UpdateDataValue and is used as a delegate, which the upgrade does not follow; it was left unchanged. Give the process-hook path its own method that takes IInstanceDataMutator.",
                ]
            },
            {
                // din/innsending App/Core/Features/Utils/FormDataHelper.cs:8.
                "a helper created with the instance and the client keeps its calls, with a to-do (O4)",
                """
                    public class FormDataHelper(Instance instance, IInstanceClient instanceClient)
                    {
                        public async Task SetStatus() => await instanceClient.UpdateDataValue(instance, "status", "x");
                    }

                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var helper = new FormDataHelper(instance, instanceClient);
                            await helper.SetStatus();
                        }
                    }
                    """,
                ["public async Task SetStatus() => await instanceClient.UpdateDataValue(instance, \"status\", \"x\");"],
                [
                    "FormDataHelper.SetStatus writes to Storage with IInstanceClient.UpdateDataValue and is called from ProcessTaskEnd.End; it was left unchanged (it gets the instance or a Storage client through its constructor (new FormDataHelper(instance, instanceClient))). Give the process-hook path its own method that takes IInstanceDataMutator.",
                ]
            },
            {
                "a write back that a live read would make unnecessary stays in a helper that cannot get the mutator",
                ReadModifyWriteInAConstructedHelper,
                ["await dataClient.UpdateFormData(instance, s, el);"],
                [
                    $"FormDataHelper.Touch writes to Storage with IDataClient.UpdateFormData and {LeftInAConstructedHelper}",
                ]
            },
            {
                "the lock, the unlock and an Update that sends nothing new stay in a helper that cannot get the mutator",
                """
                    public class FormDataHelper(Instance instance, IDataClient dataClient)
                    {
                        public async Task Touch(DataElement el, object model)
                        {
                            await dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(el.Id));
                            await dataClient.UpdateFormData(instance, model, el);
                            var locked = await dataClient.LockDataElement(new InstanceIdentifier(instance), Guid.Parse(el.Id));
                            await dataClient.Update(instance, locked);
                        }
                    }

                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var helper = new FormDataHelper(instance, dataClient);
                            await helper.Touch(instance.Data[0], new object());
                        }
                    }
                    """,
                [
                    "await dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(el.Id));",
                    "await dataClient.UpdateFormData(instance, model, el);",
                    "var locked = await dataClient.LockDataElement(new InstanceIdentifier(instance), Guid.Parse(el.Id));",
                    "await dataClient.Update(instance, locked);",
                ],
                [
                    $"FormDataHelper.Touch writes to Storage with IDataClient.UnlockDataElement and {LeftInAConstructedHelper}",
                    $"FormDataHelper.Touch writes to Storage with IDataClient.UpdateFormData and {LeftInAConstructedHelper}",
                    $"FormDataHelper.Touch writes to Storage with IDataClient.LockDataElement and {LeftInAConstructedHelper}",
                    $"FormDataHelper.Touch writes to Storage with IDataClient.Update and {LeftInAConstructedHelper}",
                ]
            },
            {
                // din/innsending App/Core/Features/Utils/FormDataHelper.cs:15, also created outside the transition.
                "a write a rule leaves in a helper that cannot get the mutator also says why",
                """
                    public class FormDataHelper(Instance instance, IDataClient dataClient)
                    {
                        public async Task SetStatus() => await dataClient.Update(instance, instance.Data[0]);
                    }

                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var helper = new FormDataHelper(instance, dataClient);
                            await helper.SetStatus();
                        }
                    }

                    public class Gateway(IDataClient dataClient)
                    {
                        public FormDataHelper For(Instance other) => new FormDataHelper(other, dataClient);
                    }
                    """,
                [
                    "public async Task SetStatus() => await dataClient.Update(instance, instance.Data[0]);",
                    "public async Task SetStatus() => await dataClient.Update(instance, instance.Data[0]);",
                ],
                [
                    "IDataClient.Update still writes to Storage directly in ProcessTaskEnd.End: the upgrade could not tell which instance instance refers to. If it is this instance, use dataMutator.UpdateDataElementMetadata, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition.",
                    $"FormDataHelper.SetStatus writes to Storage with IDataClient.Update and {LeftInAConstructedHelper}",
                ]
            },
        };

    [Theory]
    [MemberData(nameof(Unthreadable))]
    public void AHelperThatCannotGetTheMutator_KeepsEveryWrite_WithATodo(
        string label,
        string source,
        string[] anchors,
        string[] texts
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.All(
            anchors.Zip(texts),
            expected =>
                Assert.Single(
                    result.Messages,
                    message => message == At(source, expected.First, UpgradeMessageStatus.Todo, expected.Second)
                )
        );
        Assert.All(anchors, anchor => Assert.Contains(anchor, _app.Read(HookPath), StringComparison.Ordinal));
    }

    [Fact]
    public void AReadInAHelperThatCannotGetTheMutator_StaysWithAWarning()
    {
        _app.Write(HookPath, InApp(ReadModifyWriteInAConstructedHelper));

        var result = Port(AppFolder);

        Assert.Contains(
            At(
                ReadModifyWriteInAConstructedHelper,
                "var model = await dataClient.GetFormData(instance, el);",
                UpgradeMessageStatus.Warning,
                "IDataClient.GetFormData still reads Storage directly in FormDataHelper.Touch, which cannot get the mutator (it gets the instance or a Storage client through its constructor (new FormDataHelper(instance, dataClient))). The read works while the process is transitioning, but it does not see what the step changed before it."
            ),
            result.Messages
        );
    }
}
