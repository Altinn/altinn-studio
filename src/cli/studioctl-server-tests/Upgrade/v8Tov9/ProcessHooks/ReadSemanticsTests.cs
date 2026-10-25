using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// C-RF1 and C-RF2: a form read stays live only where the code never changes what it read, or writes it back to the
/// same element right after changing it; any other read becomes a copy, as v8's read was.
/// </summary>
public sealed class ReadSemanticsTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> Rewrites =>
        new()
        {
            {
                // brg/aarsregnskap-bank-202404 App/logic/DataProcessing/ProcessTaskEnd.cs:63-70.
                "a read that only reads values, live",
                """
                    public class Model { public Inner? Skjemainnhold { get; set; } }
                    public class Inner { public string? regnskapsaar { get; set; } }

                    public class ProcessTaskEnd(IDataClient dataClient, IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var element = instance.Data.Find(e => e.DataType == "Hovedskjema")!;
                            var formData = await dataClient.GetFormData<Model>(instance, element);
                            var regnskapsaar = formData?.Skjemainnhold?.regnskapsaar;
                            if (regnskapsaar is null) return;
                            await instanceClient.UpdateDataValue(instance, "regnskapsaar", regnskapsaar);
                        }
                    }
                    """,
                $$"""
                    public class Model { public Inner? Skjemainnhold { get; set; } }
                    public class Inner { public string? regnskapsaar { get; set; } }

                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var element = instance.Data.Find(e => e.DataType == "Hovedskjema")!;
                            var formData = await dataMutator.GetFormData<Model>(element);
                            var regnskapsaar = formData?.Skjemainnhold?.regnskapsaar;
                            if (regnskapsaar is null) return {{HandlerResult}}.Success();
                            dataMutator.SetDataValue("regnskapsaar", regnskapsaar);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dsb/elvirksomhet App/logic/TaskProcessing/ProcessTaskEnd.cs:27-43.
                "a read that is changed and written with the obsolete overloads: a copy, and the write",
                """
                    public class Form { public string? Name { get; set; } }

                    public class ProcessTaskEnd(IDataClient iData) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                            var dataElement = instance.Data.Find(d => d.DataType == "datamodel")!;
                            var form = await GetForm(instanceOwnerPartyId, dataElement);
                            form.Name = "x";
                            await iData.UpdateData(form, new Guid(dataElement.InstanceGuid), typeof(Form), instance.Org, instance.AppId, instanceOwnerPartyId, Guid.Parse(dataElement.Id));
                        }

                        private async Task<Form> GetForm(int partyId, DataElement dataElement) =>
                            (Form)await iData.GetFormData(new Guid(dataElement.InstanceGuid), typeof(Form), "org", "app", partyId, Guid.Parse(dataElement.Id));
                    }
                    """,
                $$"""
                    public class Form { public string? Name { get; set; } }

                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                            var dataElement = instance.Data.Find(d => d.DataType == "datamodel")!;
                            var form = await GetForm(dataMutator, instanceOwnerPartyId, dataElement);
                            form.Name = "x";
                            await dataMutator.ReplaceFormData(dataElement, form);
                            return {{HandlerResult}}.Success();
                        }

                        private async Task<Form> GetForm({{IInstanceDataMutator}} dataMutator, int partyId, DataElement dataElement) =>
                            (Form)await dataMutator.GetFormDataCopy(dataElement);
                    }
                    """
            },
            {
                // dmf/maling-rapportering App/logic/ArkivMetadataPopulationOnTaskEnd.cs:25-32.
                "read, change and write back, with a return before the change (W4)",
                """
                    public class model { public string? A { get; set; } }

                    public static class ArkivMetadataPopulator
                    {
                        public static void Populate(model m, Instance instance) => m.A = instance.Id;
                    }

                    public class ArkivMetadataPopulationOnTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var dataElement = instance.Data.First(d => d.DataType == "model");
                            var data = await dataClient.GetFormData(instance, dataElement);
                            if (data is not model model)
                                return;
                            ArkivMetadataPopulator.Populate(model, instance);
                            await dataClient.UpdateFormData(instance, data, dataElement);
                        }
                    }
                    """,
                $$"""
                    public class model { public string? A { get; set; } }

                    public static class ArkivMetadataPopulator
                    {
                        public static void Populate(model m, Instance instance) => m.A = instance.Id;
                    }

                    public class ArkivMetadataPopulationOnTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var dataElement = instance.Data.First(d => d.DataType == "model");
                            var data = await dataMutator.GetFormData(dataElement);
                            if (data is not model model)
                                return {{HandlerResult}}.Success();
                            ArkivMetadataPopulator.Populate(model, instance);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // krt/krt-1027a-1 App/logic/Dataprocessing/ProcessEndHandler.cs:30-35.
                "read, change and write back, then a value read",
                """
                    public class Model { public string? Sak { get; set; } }

                    public class ProcessEndHandler(IDataClient dataClient, ILogger<ProcessEndHandler> logger) : IProcessEnd
                    {
                        public async Task End(Instance instance, List<InstanceEvent>? events)
                        {
                            var dataElement = instance.Data.First(d => d.DataType == "model");
                            var dataModel = (Model)await dataClient.GetFormData(instance, dataElement);
                            dataModel.Sak = "123";
                            await dataClient.UpdateFormData(instance, dataModel, dataElement);
                            logger.LogInformation("Saved {Sak}", dataModel.Sak);
                        }
                    }
                    """,
                $$"""
                    public class Model { public string? Sak { get; set; } }

                    public class ProcessEndHandler(ILogger<ProcessEndHandler> logger) : {{IOnProcessEndedHandler}}
                    {
                        public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var dataElement = instance.Data.First(d => d.DataType == "model");
                            var dataModel = (Model)await dataMutator.GetFormData(dataElement);
                            dataModel.Sak = "123";
                            logger.LogInformation("Saved {Sak}", dataModel.Sak);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // krt/krt-3010a-1 App/logic/ProcessTaskEnd.cs:43-51.
                "a change outside the block of the write: a copy",
                """
                    public class Model { public string? A { get; set; } public string? B { get; set; } }

                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var dataElement = instance.Data.First(d => d.DataType == "model");
                            var dataModel = (Model)await dataClient.GetFormData(instance, dataElement);
                            dataModel.A = "a";
                            if (taskId == "Task_1")
                            {
                                dataModel.B = "b";
                                await dataClient.UpdateFormData(instance, dataModel, dataElement);
                            }
                        }
                    }
                    """,
                $$"""
                    public class Model { public string? A { get; set; } public string? B { get; set; } }

                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var dataElement = instance.Data.First(d => d.DataType == "model");
                            var dataModel = (Model)await dataMutator.GetFormDataCopy(dataElement);
                            dataModel.A = "a";
                            if (taskId == "Task_1")
                            {
                                dataModel.B = "b";
                                await dataMutator.ReplaceFormData(dataElement, dataModel);
                            }
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // lt/sasp App/logic/TaskProcessing/ProcessTaskEnd.cs:28-40.
                "a return between the change and the write: a copy",
                """
                    public class Form { public string? A { get; set; } }

                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var dataElement = instance.Data.First(d => d.DataType == "form");
                            var form = (Form)await dataClient.GetFormData(instance, dataElement);
                            form.A = "a";
                            if (taskId != "Task_1")
                                return;
                            await dataClient.UpdateFormData(instance, form, dataElement);
                        }
                    }
                    """,
                $$"""
                    public class Form { public string? A { get; set; } }

                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var dataElement = instance.Data.First(d => d.DataType == "form");
                            var form = (Form)await dataMutator.GetFormDataCopy(dataElement);
                            form.A = "a";
                            if (taskId != "Task_1")
                                return {{HandlerResult}}.Success();
                            await dataMutator.ReplaceFormData(dataElement, form);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // v8 saved nothing when Validate threw.
                "a write back in a try whose catch goes on without it: a copy, and the write stays",
                """
                    public class Skjema { public string? A { get; set; } }

                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var el = instance.Data[0];
                            var data = await dataClient.GetFormData(instance, el);
                            if (data is not Skjema s)
                                return;
                            try
                            {
                                s.A = "x";
                                Validate(s);
                                await dataClient.UpdateFormData(instance, s, el);
                            }
                            catch (InvalidOperationException)
                            {
                            }
                        }

                        private static void Validate(Skjema s)
                        {
                            if (s.A == "x") throw new InvalidOperationException();
                        }
                    }
                    """,
                $$"""
                    public class Skjema { public string? A { get; set; } }

                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var el = instance.Data[0];
                            var data = await dataMutator.GetFormDataCopy(el);
                            if (data is not Skjema s)
                                return {{HandlerResult}}.Success();
                            try
                            {
                                s.A = "x";
                                Validate(s);
                                await dataMutator.ReplaceFormData(el, s);
                            }
                            catch (InvalidOperationException)
                            {
                            }
                            return {{HandlerResult}}.Success();
                        }

                        private static void Validate(Skjema s)
                        {
                            if (s.A == "x") throw new InvalidOperationException();
                        }
                    }
                    """
            },
            {
                // A live read would share the object the other read changes.
                "a value read of an element that a live read changes later in the method: a copy",
                """
                    public class Skjema { public string? A { get; set; } }

                    public class ProcessTaskEnd(IDataClient dataClient, IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var el = instance.Data[0];
                            var before = (Skjema)await dataClient.GetFormData(instance, el);
                            var data = await dataClient.GetFormData(instance, el);
                            if (data is not Skjema s)
                                return;
                            s.A = "changed";
                            await dataClient.UpdateFormData(instance, s, el);
                            await instanceClient.UpdateDataValue(instance, "old", before.A);
                        }
                    }
                    """,
                $$"""
                    public class Skjema { public string? A { get; set; } }

                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var el = instance.Data[0];
                            var before = (Skjema)await dataMutator.GetFormDataCopy(el);
                            var data = await dataMutator.GetFormData(el);
                            if (data is not Skjema s)
                                return {{HandlerResult}}.Success();
                            s.A = "changed";
                            dataMutator.SetDataValue("old", before.A);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(Rewrites))]
    public void TheRead_IsLiveOnlyWhereTheCodeNeverChangesItOrWritesItBackAtOnce(
        string label,
        string before,
        string after
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Empty(result.Todos);
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void AReadChangedAndWrittenBackInANestedBlock_IsLive_AndTheWriteBackGoes()
    {
        // hdir/bevillinger-alkohol-tobakk App/logic/DataProcessing/ProcessEndTask.cs:42-66.
        var source = """
            public class Skjema { public string? Status { get; set; } }

            public class ProcessEndTask(IDataClient dataClient) : IProcessEnd
            {
                public async Task End(Instance instance, List<InstanceEvent>? events)
                {
                    var dataElement = instance.Data.First(d => d.DataType == "skjema");
                    var skjema = (Skjema)await dataClient.GetFormData(instance, dataElement);
                    if (skjema.Status is null)
                    {
                        skjema.Status = "ferdig";
                        await dataClient.UpdateFormData(instance, skjema, dataElement);
                    }
                }
            }
            """;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class Skjema { public string? Status { get; set; } }

                public class ProcessEndTask : {{IOnProcessEndedHandler}}
                {
                    public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
                    {
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        Instance instance = dataMutator.Instance;
                        var dataElement = instance.Data.First(d => d.DataType == "skjema");
                        var skjema = (Skjema)await dataMutator.GetFormData(dataElement);
                        if (skjema.Status is null)
                        {
                            skjema.Status = "ferdig";
                        }
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        Assert.Contains(
            At(
                source,
                "var skjema = (Skjema)await dataClient.GetFormData(instance, dataElement);",
                UpgradeMessageStatus.Warning,
                "IDataClient.GetFormData now reads the form with dataMutator.GetFormData, and the write back at line 28 was removed: the transition saves the changed form."
            ),
            result.Messages
        );
        Assert.DoesNotContain(
            result.Messages,
            message => message.Text.Contains("now replaces the form", StringComparison.Ordinal)
        );
        AssertCompilesAgainstV9(AppFolder);
    }
}
