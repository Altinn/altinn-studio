using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// <c>DataCreation</c> takes the mutator, the overload v9 calls, where it reaches Storage; what it does in the
/// workflow engine's callback is reported only when the app has an auto-created form.
/// </summary>
public sealed class DataCreationPortTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> Rewrites =>
        new()
        {
            {
                // SSB ×123 classes outside the window.
                "a DataCreation that reaches no Storage call stays as it is",
                """
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor : IInstantiationProcessor
                    {
                        public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                        {
                            if (data is Model model)
                                model.A = instance.Id;
                            return Task.CompletedTask;
                        }
                    }
                    """,
                """
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor : IInstantiationProcessor
                    {
                        public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                        {
                            if (data is Model model)
                                model.A = instance.Id;
                            return Task.CompletedTask;
                        }
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(Rewrites))]
    public void DataCreation_GetsTheMutatorWhereItReachesStorage(string label, string before, string after)
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Empty(result.Todos);
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void DataCreation_TakesTheMutator_AndASubstatusSetThereIsWarnedAbout()
    {
        // digdir/regvil-2025-initiell App/logic/instantiation/InstantiationProcessor.cs:59-70.
        var source = """
            public class InstantiationProcessor(IInstanceClient instanceClient) : IInstantiationProcessor
            {
                public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                {
                    var id = new InstanceIdentifier(instance);
                    await instanceClient.UpdateSubstatus(id.InstanceOwnerPartyId, id.InstanceGuid, new Substatus { Label = "mottatt" }, StorageAuthenticationMethod.ServiceOwner());
                }
            }
            """;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class InstantiationProcessor : IInstantiationProcessor
                {
                    public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
                    {
                        Instance instance = dataMutator.Instance;
                        var id = new InstanceIdentifier(instance);
                        dataMutator.SetSubstatus(new Substatus { Label = "mottatt" });
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        Assert.Contains(
            At(
                source,
                "public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)",
                UpgradeMessageStatus.Warning,
                "InstantiationProcessor.DataCreation now takes IInstanceDataMutator, the overload v9 calls; the data it changes through the mutator is saved with the new data element."
            ),
            result.Messages
        );
        Assert.Contains(
            At(
                source,
                "await instanceClient.UpdateSubstatus(id.InstanceOwnerPartyId, id.InstanceGuid, new Substatus { Label = \"mottatt\" }, StorageAuthenticationMethod.ServiceOwner());",
                UpgradeMessageStatus.Warning,
                "DataCreation also runs when an instance is created with data or a data element is posted; there the substatus is saved with the caller's token, which Storage accepts only from the app owner, so a user's request fails with 403, as v8's PUT did."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    public static TheoryData<string, string, string> ServiceOwnerCalls =>
        new()
        {
            {
                // staf ×2 App/logic/Clients/DataClientWrapper.cs:49,80,105, in one method.
                "a read and its write back",
                """
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor(IDataClient dataClient) : IInstantiationProcessor
                    {
                        public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                        {
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            var model = (Model)await dataClient.GetFormData(instance, element, StorageAuthenticationMethod.ServiceOwner());
                            model.A = "a";
                            await dataClient.UpdateFormData(instance, model, element, StorageAuthenticationMethod.ServiceOwner());
                        }
                    }
                    """,
                $$"""
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor : IInstantiationProcessor
                    {
                        public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
                        {
                            Instance instance = dataMutator.Instance;
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            dataMutator.OverrideAuthenticationMethod(dataMutator.GetDataType(element), StorageAuthenticationMethod.ServiceOwner());
                            var model = (Model)await dataMutator.GetFormData(element);
                            model.A = "a";
                        }
                    }
                    """
            },
            {
                "two writes of one data type",
                """
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor(IDataClient dataClient) : IInstantiationProcessor
                    {
                        public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                        {
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            await dataClient.UpdateFormData(instance, new Model { A = "a" }, element, StorageAuthenticationMethod.ServiceOwner());
                            await dataClient.UpdateFormData(instance, new Model { A = "b" }, element, StorageAuthenticationMethod.ServiceOwner());
                        }
                    }
                    """,
                $$"""
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor : IInstantiationProcessor
                    {
                        public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
                        {
                            Instance instance = dataMutator.Instance;
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            dataMutator.OverrideAuthenticationMethod(dataMutator.GetDataType(element), StorageAuthenticationMethod.ServiceOwner());
                            await dataMutator.ReplaceFormData(element, new Model { A = "a" });
                            await dataMutator.ReplaceFormData(element, new Model { A = "b" });
                        }
                    }
                    """
            },
            {
                "a write back that alone has the service owner's token",
                """
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor(IDataClient dataClient) : IInstantiationProcessor
                    {
                        public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                        {
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            var model = (Model)await dataClient.GetFormData(instance, element);
                            model.A = "a";
                            await dataClient.UpdateFormData(instance, model, element, StorageAuthenticationMethod.ServiceOwner());
                        }
                    }
                    """,
                $$"""
                    public class Model { public string? A { get; set; } }

                    public class InstantiationProcessor : IInstantiationProcessor
                    {
                        public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
                        {
                            Instance instance = dataMutator.Instance;
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            dataMutator.OverrideAuthenticationMethod(dataMutator.GetDataType(element), StorageAuthenticationMethod.ServiceOwner());
                            var model = (Model)await dataMutator.GetFormData(element);
                            model.A = "a";
                        }
                    }
                    """
            },
            {
                "a binary read",
                """
                    public class InstantiationProcessor(IDataClient dataClient) : IInstantiationProcessor
                    {
                        public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                        {
                            var id = new InstanceIdentifier(instance);
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            var bytes = await dataClient.GetDataBytes(id.InstanceOwnerPartyId, id.InstanceGuid, Guid.Parse(element.Id), StorageAuthenticationMethod.ServiceOwner());
                            Console.WriteLine(bytes.Length);
                        }
                    }
                    """,
                $$"""
                    public class InstantiationProcessor : IInstantiationProcessor
                    {
                        public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
                        {
                            Instance instance = dataMutator.Instance;
                            var id = new InstanceIdentifier(instance);
                            var element = instance.Data.First(d => d.DataType == "sensitive");
                            dataMutator.OverrideAuthenticationMethod(dataMutator.GetDataType(element), StorageAuthenticationMethod.ServiceOwner());
                            var bytes = (await dataMutator.GetBinaryData(element)).ToArray();
                            Console.WriteLine(bytes.Length);
                        }
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(ServiceOwnerCalls))]
    public void ACallAsTheServiceOwner_InDataCreation_OverridesTheDataTypesAuthenticationOnce(
        string label,
        string before,
        string after
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        AssertCompilesAgainstV9(AppFolder);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TheCallerRead_InADataCreation_IsATodoOnlyWithAnAutoCreatedForm(bool autoCreate)
    {
        // nfk ×15 InstantiationProcessor reading IAuthenticationContext.Current. Without an auto-created form,
        // DataCreation runs only on the user's own requests.
        var source = """
            public class InstantiationProcessor(Altinn.App.Core.Features.Auth.IAuthenticationContext authenticationContext, ILogger<InstantiationProcessor> logger) : IInstantiationProcessor
            {
                public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                {
                    logger.LogInformation("{Caller}", authenticationContext.Current);
                    return Task.CompletedTask;
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(
            MetadataPath,
            $$"""
            {
              "id": "nfk/app",
              "dataTypes": [
                {
                  "id": "skjema",
                  "appLogic": {
                    "classRef": "App.Logic.Model",
                    "autoCreate": {{(autoCreate ? "true" : "false")}}
                  }
                }
              ]
            }
            """
        );

        var result = Port(AppFolder);

        Assert.Equal(
            autoCreate
                ?
                [
                    At(
                        source,
                        "logger.LogInformation(\"{Caller}\", authenticationContext.Current);",
                        UpgradeMessageStatus.Todo,
                        "reads IAuthenticationContext.Current in InstantiationProcessor.DataCreation. In v9 the hook runs in the workflow engine's callback, where IAuthenticationContext.Current is the app itself and the HTTP request is the engine's, so the user who moved the process on is not available. This is a gap in the v9 app libraries, not in your code; keep this code until a release closes it, then read who started the transition from the Actor on the context that v9 hooks, service tasks and IInstantiationProcessor.DataCreation(DataCreationContext) get."
                    ),
                ]
                : [],
            result.Messages.Where(static message =>
                message.Text.Contains("IAuthenticationContext.Current", StringComparison.Ordinal)
            )
        );
    }
}
