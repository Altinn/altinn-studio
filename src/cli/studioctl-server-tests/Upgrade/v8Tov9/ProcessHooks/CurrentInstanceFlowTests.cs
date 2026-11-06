using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// Precondition I: a call moves to the mutator only when its instance argument is the transition's own instance, in one
/// of the forms the fleet passes it in; another instance, or one the upgrade cannot place, is a to-do.
/// </summary>
public sealed class CurrentInstanceFlowTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> CurrentInstance =>
        new()
        {
            {
                // brg/aarsregnskap-bank-202404 ProcessTaskEnd.cs:69.
                "form 1: the hook's instance",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await instanceClient.UpdateDataValue(instance, "k", "v");
                        }
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dibk/ig-v3 ProcessTaskEnd.cs:64-66.
                "form 2 and 3: the id and its parts parsed",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var guid = Guid.Parse(instance.Id.Split("/")[1]);
                            var party = int.Parse(instance.Id.Split("/")[0]);
                            await instanceClient.UpdateDataValues(party, guid, new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var guid = Guid.Parse(instance.Id.Split("/")[1]);
                            var party = int.Parse(instance.Id.Split("/")[0]);
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // kv/soknad-utlevering-eiendomsdata DynamicsIntegrationService.cs:180-185, hdir/hdir-ettersending MetadataProcessor.cs:33-37.
                "form 3: through an array local, and TryParse",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var parts = instance.Id.Split('/');
                            Guid.TryParse(parts[1], out var guid);
                            int.TryParse(parts[0], out var party);
                            await instanceClient.UpdateDataValues(party, guid, new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var parts = instance.Id.Split('/');
                            Guid.TryParse(parts[1], out var guid);
                            int.TryParse(parts[0], out var party);
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // brg/stottetildeling-ny ProcessTaskEnd.cs:263-264.
                "form 4: the party id parsed",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var party = Convert.ToInt32(instance.InstanceOwner.PartyId);
                            var guid = new Guid(instance.Id.Split("/")[1]);
                            await instanceClient.UpdateDataValues(party, guid, new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var party = Convert.ToInt32(instance.InstanceOwner.PartyId);
                            var guid = new Guid(instance.Id.Split("/")[1]);
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // buf/fosterhjem-ep-skjema-person-b SigningTaskEnd.cs:52-53.
                "form 5: an InstanceIdentifier and its members (W3)",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var iId = new InstanceIdentifier(instance.Id);
                            await instanceClient.AddCompleteConfirmation(iId.InstanceOwnerPartyId, iId.InstanceGuid);
                        }
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var iId = new InstanceIdentifier(instance.Id);
                            dataMutator.AddCompleteConfirmation();
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dsb/elvirksomhet ProcessTaskEnd.cs:25,45.
                "form 6: the instance guid of one of its data elements",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var element = instance.Data.Find(d => d.DataType == "x")!;
                            var party = int.Parse(instance.InstanceOwner.PartyId);
                            await instanceClient.UpdateDataValues(party, new Guid(element.InstanceGuid), new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var element = instance.Data.Find(d => d.DataType == "x")!;
                            var party = int.Parse(instance.InstanceOwner.PartyId);
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // nfk/trinn1-planuttalelse-bhg-skole SkjulteVedleggProcessor.cs:95-99.
                "form 7: a local every assignment of which is current",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            int party;
                            if (taskId == "Task_1")
                                party = int.Parse(instance.InstanceOwner.PartyId);
                            else
                                party = new InstanceIdentifier(instance).InstanceOwnerPartyId;
                            var guid = new InstanceIdentifier(instance).InstanceGuid;
                            await instanceClient.UpdateDataValues(party, guid, new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            int party;
                            if (taskId == "Task_1")
                                party = int.Parse(instance.InstanceOwner.PartyId);
                            else
                                party = new InstanceIdentifier(instance).InstanceOwnerPartyId;
                            var guid = new InstanceIdentifier(instance).InstanceGuid;
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // digdir/regvil-2025-initiell InstantiationProcessor.cs:63, InstanceHelper.cs:32.
                "form 9: a tuple from an app helper (W2)",
                """
                    public static class InstanceHelper
                    {
                        public static (int, Guid) GetInstanceIds(Instance instance) => (int.Parse(instance.InstanceOwner.PartyId), new Guid(instance.Id.Split("/")[1]));
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            (int party, Guid guid) = InstanceHelper.GetInstanceIds(instance);
                            await instanceClient.UpdateSubstatus(party, guid, new Substatus { Label = "mottatt" });
                        }
                    }
                    """,
                $$"""
                    public static class InstanceHelper
                    {
                        public static (int, Guid) GetInstanceIds(Instance instance) => (int.Parse(instance.InstanceOwner.PartyId), new Guid(instance.Id.Split("/")[1]));
                    }

                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            (int party, Guid guid) = InstanceHelper.GetInstanceIds(instance);
                            dataMutator.SetSubstatus(new Substatus { Label = "mottatt" });
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dat/bemanning-soknad InstanceExtentions.cs:9-22.
                "form 9: an app extension method",
                """
                    public static class InstanceExtentions
                    {
                        public static Guid GetGuid(this Instance instance) => Guid.Parse(instance.Id.Split("/")[1]);
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var guid = instance.GetGuid();
                            var party = int.Parse(instance.InstanceOwner.PartyId);
                            await instanceClient.UpdateDataValues(party, guid, new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                $$"""
                    public static class InstanceExtentions
                    {
                        public static Guid GetGuid(this Instance instance) => Guid.Parse(instance.Id.Split("/")[1]);
                    }

                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var guid = instance.GetGuid();
                            var party = int.Parse(instance.InstanceOwner.PartyId);
                            dataMutator.SetDataValue("k", "v");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // pat/patent FillFieldsHelper.cs:867.
                "form 8: a parameter every caller passes the instance to",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await Save(int.Parse(instance.InstanceOwner.PartyId), new InstanceIdentifier(instance).InstanceGuid);
                        }

                        private async Task Save(int partyId, Guid instanceGuid) =>
                            await instanceClient.UpdateDataValues(partyId, instanceGuid, new DataValues { Values = new() { { "k", "v" } } });
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            await Save(dataMutator, int.Parse(instance.InstanceOwner.PartyId), new InstanceIdentifier(instance).InstanceGuid);
                            return {{HandlerResult}}.Success();
                        }

                        private async Task Save({{IInstanceDataMutator}} dataMutator, int partyId, Guid instanceGuid)
                        {
                            dataMutator.SetDataValue("k", "v");
                        }
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(CurrentInstance))]
    public void ACallForTheCurrentInstance_InEachForm_IsMoved(string label, string before, string after)
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Empty(result.Todos);
        AssertCompilesAgainstV9(AppFolder);
    }

    public static TheoryData<string, string, string, string> OtherInstances =>
        new()
        {
            {
                // C-XO: buf/fosterhjem-ep-skjema-person-a AppInstantiationClient.cs:48 in kind.
                "another instance, read for other ids",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var other = await instanceClient.GetInstance("app", "org", 50001, Guid.Empty);
                            await instanceClient.UpdateDataValue(other, "k", "v");
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValue(other, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue writes to another instance (other) from a process hook. The mutator covers only this instance, and the step may run more than once: make the call idempotent or move it out of the transition."
            },
            {
                // The design's "could not tell which instance".
                "unknown: a guid field a data processor sets",
                """
                    public static class Holder
                    {
                        public static Guid Guid;
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var party = int.Parse(instance.InstanceOwner.PartyId);
                            await instanceClient.UpdateDataValues(party, Holder.Guid, new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValues(party, Holder.Guid, new DataValues { Values = new() { { \"k\", \"v\" } } });",
                "IInstanceClient.UpdateDataValues still writes to Storage directly in Hook.End: the upgrade could not tell which instance Holder.Guid refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: a field set to the instance in its constructor that another class can set",
                """
                    public class Holder
                    {
                        public Instance Instance;

                        public Holder(Instance instance)
                        {
                            Instance = instance;
                        }
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var holder = new Holder(instance);
                            await instanceClient.UpdateDataValue(holder.Instance, "k", "v");
                        }
                    }

                    public class Swapper
                    {
                        public void Swap(Holder holder, Instance other) => holder.Instance = other;
                    }
                    """,
                "await instanceClient.UpdateDataValue(holder.Instance, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End: the upgrade could not tell which instance holder.Instance refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: a field set to the instance in its constructor that another class sets by deconstruction",
                """
                    public class Holder
                    {
                        public Instance Instance;

                        public Holder(Instance instance)
                        {
                            Instance = instance;
                        }
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var holder = new Holder(instance);
                            await instanceClient.UpdateDataValue(holder.Instance, "k", "v");
                        }
                    }

                    public class Swapper
                    {
                        public void Swap(Holder holder, Instance other) => (holder.Instance, _) = (other, 1);
                    }
                    """,
                "await instanceClient.UpdateDataValue(holder.Instance, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End: the upgrade could not tell which instance holder.Instance refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: a field set to the instance in its constructor that another class sets with ??=",
                """
                    public class Holder
                    {
                        public Instance Instance;

                        public Holder(Instance instance)
                        {
                            Instance = instance;
                        }
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var holder = new Holder(instance);
                            await instanceClient.UpdateDataValue(holder.Instance, "k", "v");
                        }
                    }

                    public class Swapper
                    {
                        public void Swap(Holder holder, Instance other) => holder.Instance ??= other;
                    }
                    """,
                "await instanceClient.UpdateDataValue(holder.Instance, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End: the upgrade could not tell which instance holder.Instance refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: a field set to the instance in its constructor that another class passes by ref",
                """
                    public class Holder
                    {
                        public Instance Instance;

                        public Holder(Instance instance)
                        {
                            Instance = instance;
                        }
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var holder = new Holder(instance);
                            await instanceClient.UpdateDataValue(holder.Instance, "k", "v");
                        }
                    }

                    public class Swapper
                    {
                        public void Swap(Holder holder, Instance other) => Interlocked.Exchange(ref holder.Instance, other);
                    }
                    """,
                "await instanceClient.UpdateDataValue(holder.Instance, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End: the upgrade could not tell which instance holder.Instance refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: a constructor parameter that a chained constructor passes another instance",
                """
                    public class Holder
                    {
                        public Instance Instance;

                        public Holder(Instance instance)
                        {
                            Instance = instance;
                        }

                        public Holder()
                            : this(new Instance()) { }
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var holder = new Holder(instance);
                            await instanceClient.UpdateDataValue(holder.Instance, "k", "v");
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValue(holder.Instance, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End: the upgrade could not tell which instance holder.Instance refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: a constructor parameter that a derived type's primary constructor passes another instance",
                """
                    public class Holder
                    {
                        public Instance Instance;

                        public Holder(Instance instance)
                        {
                            Instance = instance;
                        }
                    }

                    public class OtherHolder(Instance other) : Holder(other);

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var own = new Holder(instance);
                            Holder holder = new OtherHolder(new Instance());
                            await instanceClient.UpdateDataValue(holder.Instance, "k", "v");
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValue(holder.Instance, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End: the upgrade could not tell which instance holder.Instance refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: a primary-constructor parameter that a member of the type reassigns",
                """
                    public class Holder(IInstanceClient instanceClient, Instance instance)
                    {
                        public void Swap(Instance other) => instance = other;

                        public Task Save() => instanceClient.UpdateDataValue(instance, "k", "v");
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var holder = new Holder(instanceClient, instance);
                            await holder.Save();
                        }
                    }
                    """,
                "public Task Save() => instanceClient.UpdateDataValue(instance, \"k\", \"v\");",
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End: the upgrade could not tell which instance instance refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
            {
                "unknown: an app helper that reassigns the instance parameter it is passed",
                """
                    public static class InstanceHelper
                    {
                        public static Instance Last = new Instance();

                        public static Guid GetGuid(Instance instance)
                        {
                            instance = Last;
                            return Guid.Parse(instance.Id.Split("/")[1]);
                        }
                    }

                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var party = int.Parse(instance.InstanceOwner.PartyId);
                            await instanceClient.UpdateDataValues(party, InstanceHelper.GetGuid(instance), new DataValues { Values = new() { { "k", "v" } } });
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValues(party, InstanceHelper.GetGuid(instance), new DataValues { Values = new() { { \"k\", \"v\" } } });",
                "IInstanceClient.UpdateDataValues still writes to Storage directly in Hook.End: the upgrade could not tell which instance InstanceHelper.GetGuid(instance) refers to. If it is this instance, use dataMutator.SetDataValue, since v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the call out of the transition."
            },
        };

    [Theory]
    [MemberData(nameof(OtherInstances))]
    public void ACallForAnotherOrAnUnknownInstance_IsATodo(string label, string source, string anchor, string text)
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Todo, text), result.Messages);
    }

    [Fact]
    public void TheIdsFromTheKnownPackageExtensions_AreTheCurrentInstance()
    {
        // dat/yrkeskvalifikasjon-soknad PreSubmitProcessor.cs:60-84.
        var source = """
            public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    await instanceClient.UpdateDataValues(AT.Common.Altinn.Extensions.InstanceExtensions.GetInstanceOwnerPartyId(instance), AT.Common.Altinn.Extensions.InstanceExtensions.GetInstanceGuid(instance), new DataValues { Values = new() { { "k", "v" } } });
                }
            }
            """;
        _app.Write(HookPath, InApp(source));

        Port(AppFolder, AtExtensions);

        Assert.Equal(
            InApp(
                $$"""
                public class Hook : {{IOnTaskEndingHandler}}
                {
                    public bool ShouldRunForTask(string taskId) => true;

                    public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                    {
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        dataMutator.SetDataValue("k", "v");
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        AssertCompilesAgainstV9(AppFolder, AtExtensions);
    }
}
