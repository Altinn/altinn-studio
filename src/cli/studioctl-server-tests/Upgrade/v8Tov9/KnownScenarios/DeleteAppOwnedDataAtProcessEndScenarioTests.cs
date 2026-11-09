using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;
using Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

namespace Studioctl.Tests.Upgrade.v8Tov9.KnownScenarios;

public sealed class DeleteAppOwnedDataAtProcessEndScenarioTests : IDisposable
{
    private const string HookPath = "logic/TaskProcessors/ProcessEnd.cs";
    private const string ProgramPath = "Program.cs";
    private const string ConstantsPath = "logic/Utilities/Constants.cs";
    private const string NeighbourPath = "logic/TaskProcessors/ProcessTaskEnd.cs";
    private const string MetadataPath = "config/applicationmetadata.json";
    private const string Registration = "services.AddTransient<IProcessEnd, ProcessEnd>();";
    private const string AppOwned = "Fast_Statistikk_AppOwned";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    // --- The app the scenario was found in: nkr/faststatistikk ----------------------------------------

    /// <summary>The hook's members, as nkr/faststatistikk has them.</summary>
    private const string FaststatistikkMembers = """
            public async Task End(Instance instance, List<InstanceEvent> events)
            {
                DataElement appOwnedDataElement = instance.Data.FirstOrDefault(dataElement =>
                    dataElement.DataType == Constants.AppOwnedDataModelName
                );

                if (appOwnedDataElement != null)
                {
                    await DeleteDataModel(Constants.AppOwnedDataModelName, instance);
                }
            }

            /// <summary>
            /// Deletes the data model.
            /// </summary>
            /// <param name="dataModelName">The name of the data model filename</param>
            /// <param name="instance">The instance</param>
            private async Task DeleteDataModel(string dataModelName, Instance instance)
            {
                await dataClient.DeleteData(
                    int.Parse(instance.InstanceOwner.PartyId),
                    new Guid(instance.Id.Split("/")[1]),
                    new Guid(instance.Data.First(de => de.DataType == dataModelName).Id),
                    false
                );
            }
        """;

    /// <summary>The hook's members, as nkr/fastbudsjett has them, deleting the app-owned data type of this fixture.</summary>
    private const string FastbudsjettMembers = """
            private readonly IDataClient _dataClient;
            private readonly IAppMetadata _appMetadata;

            public ProcessEnd(IDataClient dataClient, IAppMetadata appMetadata)
            {
                _dataClient = dataClient;
                _appMetadata = appMetadata;
            }

            /// <summary>
            /// Deletes the app controlled data model Fast_Budsjett_AppControlled from storage when the instance is ended.
            /// </summary>
            /// <param name="instance"></param>
            /// <param name="events"></param>
            /// <returns></returns>
            public async Task End(Instance instance, List<InstanceEvent> events)
            {
                DataElement appOwnedDataElement = instance.Data.FirstOrDefault(dataElement => dataElement.DataType == "Fast_Statistikk_AppOwned");

                if (appOwnedDataElement != null)
                {
                    AppIdentifier appIdentifier = (await _appMetadata.GetApplicationMetadata()).AppIdentifier;
                    InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                    int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);

                    await _dataClient.DeleteData(appIdentifier.Org, appIdentifier.App, instanceOwnerPartyId, instanceIdentifier.InstanceGuid, new Guid(appOwnedDataElement.Id), false);
                }
            }
        """;

    private const string FaststatistikkDeclaration = "public class ProcessEnd(IDataClient dataClient) : IProcessEnd";

    private const string FastbudsjettDeclaration = "public class ProcessEnd : IProcessEnd";

    /// <summary>The hook file, with <paramref name="members"/> in the class.</summary>
    private static string Hook(
        string members = FaststatistikkMembers,
        string declaration = FaststatistikkDeclaration,
        string after = ""
    ) =>
        $$"""
            using System;
            using System.Collections.Generic;
            using System.Linq;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Internal.App;
            using Altinn.App.Core.Internal.Data;
            using Altinn.App.Core.Models;
            using Altinn.App.Logic.Utilities;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Altinn.App.Logic.TaskProcessors;

            /// <summary>
            /// Class used to delete the app owned data model at the end step.
            /// </summary>
            /// <param name="dataClient"></param>
            {{declaration}}
            {
            {{members}}
            }
            {{after}}
            """;

    private static string Program(params string[] registrations) =>
        """
            using Altinn.App.Core.Features;
            using Altinn.App.Logic.TaskProcessors;
            using Microsoft.Extensions.DependencyInjection;

            void RegisterCustomAppServices(IServiceCollection services)
            {
                // Register your apps custom service implementations here.
                services.AddTransient<ProcessTaskEnd>();

            """
        + string.Concat(registrations.Select(static registration => $"    {registration}\n"))
        + """
            }

            """;

    private const string Constants = """
        namespace Altinn.App.Logic.Utilities;

        public static class Constants
        {
            public const string MainDataModelName = "Fast_Statistikk";
            public const string AppOwnedDataModelName = "Fast_Statistikk_AppOwned";
        }
        """;

    private const string Neighbour = """
        namespace Altinn.App.Logic.TaskProcessors;

        public class ProcessTaskEnd { }
        """;

    /// <summary>The properties of the app-owned data type after its <c>allowedContentTypes</c>.</summary>
    private const string AppOwnedProperties = """
              "allowedContributers": [
                "app:owned"
              ],
              "appLogic": {
                "autoCreate": false,
                "classRef": "Altinn.App.Models.fast.fast",
                "allowAnonymousOnStateless": false,
                "autoDeleteOnProcessEnd": false,
                "disallowUserCreate": false,
                "disallowUserDelete": false
              },
              "taskId": "Task_1",
              "maxCount": 1,
              "minCount": 1,
              "enablePdfCreation": false,
        """;

    /// <summary>
    /// applicationmetadata.json with these properties on the app-owned data type, and the data types in
    /// <paramref name="others"/> after it.
    /// </summary>
    private static string Metadata(string appOwned = AppOwnedProperties, string others = "") =>
        $$"""
            {
              "id": "nkr/faststatistikk",
              "org": "nkr",
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
                  "id": "Fast_Statistikk",
                  "allowedContentTypes": [
                    "application/xml"
                  ],
                  "appLogic": {
                    "autoCreate": true,
                    "classRef": "Altinn.App.Models.fast.fast",
                    "autoDeleteOnProcessEnd": false
                  },
                  "taskId": "Task_1",
                  "maxCount": 1,
                  "minCount": 1,
                  "enablePdfCreation": true
                },
                {
                  "id": "Fast_Statistikk_AppOwned",
                  "allowedContentTypes": [
                    "application/xml"
                  ],
            {{appOwned}}
                  "enableFileScan": false
                }{{others}}
              ],
              "autoDeleteOnProcessEnd": false
            }
            """;

    /// <summary>A second app-owned data type, Fast_Statistikk_Kopi, to follow the first in <c>dataTypes</c>.</summary>
    private const string SecondAppOwned = """
        ,
            {
              "id": "Fast_Statistikk_Kopi",
              "allowedContributers": ["app:owned"],
              "appLogic": { "autoDeleteOnProcessEnd": false },
              "taskId": "Task_2",
              "maxCount": 1
            }
        """;

    /// <summary>Writes the app, with the parts given replacing nkr/faststatistikk's, and scans it.</summary>
    private CSharpSourceScanner Scanner(
        string? hook = null,
        string? program = null,
        string? metadata = null,
        params (string Path, string Source)[] others
    )
    {
        _app.Write(HookPath, hook ?? Hook());
        _app.Write(ProgramPath, program ?? Program(Registration));
        _app.Write(ConstantsPath, Constants);
        _app.Write(NeighbourPath, Neighbour);
        _app.Write(MetadataPath, metadata ?? Metadata());
        foreach (var (path, source) in others)
        {
            _app.Write(path, source);
        }

        return SemanticScannerFactory.CreateScanner(AppFolder, StorageCallStubs.V8);
    }

    private MigrationResult Apply(CSharpSourceScanner scanner) =>
        new DeleteAppOwnedDataAtProcessEndScenario().Apply(scanner, AppFolder);

    /// <summary>The app's files and their contents.</summary>
    private Dictionary<string, string> Files() =>
        Directory
            .EnumerateFiles(AppFolder, "*", SearchOption.AllDirectories)
            .ToDictionary(path => Path.GetRelativePath(AppFolder, path), File.ReadAllText);

    private static string AutoDeleted(string metadata, string dataType = AppOwned)
    {
        var start = metadata.IndexOf($"\"id\": \"{dataType}\"", StringComparison.Ordinal);
        var flag = metadata.IndexOf("\"autoDeleteOnProcessEnd\": false", start, StringComparison.Ordinal);
        return metadata[..flag] + "\"autoDeleteOnProcessEnd\": true" + metadata[(flag + 31)..];
    }

    private static UpgradeMessage Set(string dataType = AppOwned, string task = "Task_1") =>
        new(
            $"Set autoDeleteOnProcessEnd on data type {dataType} in config/applicationmetadata.json: v9 refuses the "
                + $"hook's delete at process end for a type bound to {task}, and deletes the data itself when the "
                + "process has ended.",
            UpgradeMessageStatus.Warning
        );

    private static UpgradeMessage Deleted(string deletes = "that delete") =>
        new(
            $"Deleted {HookPath}, whose only work was {deletes}, and its registration in "
                + $"{ProgramPath}:{LineOf(Program(Registration), Registration)}.",
            UpgradeMessageStatus.Ok
        );

    private static int LineOf(string source, string text) => ProcessHookStubs.LineOf(source, text);

    public static TheoryData<string, string> SeenShapes =>
        new()
        {
            { FaststatistikkMembers, FaststatistikkDeclaration },
            { FastbudsjettMembers, FastbudsjettDeclaration },
            { FastbudsjettMembers.Replace("appIdentifier.Org, appIdentifier.App, ", ""), FastbudsjettDeclaration },
        };

    [Theory]
    [MemberData(nameof(SeenShapes))]
    public void SetsAutoDeleteAndDeletesTheHook_InTheAppsItWasSeenIn(string members, string declaration)
    {
        var hook = Hook(members, declaration);
        var scanner = Scanner(hook);

        var result = new KnownScenarioMigration(scanner, AppFolder).Migrate();

        Assert.Equal([Set(), Deleted()], result.Messages);
        Assert.Equal(AutoDeleted(Metadata()), _app.Read(MetadataPath));
        Assert.False(File.Exists(Path.Combine(AppFolder, HookPath)));
        Assert.Equal(Program(), _app.Read(ProgramPath));
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, StorageCallStubs.V9));
    }

    /// <summary>The members of a hook that deletes the app-owned data type and Fast_Statistikk_Kopi.</summary>
    private const string TwoDataTypesMembers = """
            public async Task End(Instance instance, List<InstanceEvent> events)
            {
                var first = instance.Data.FirstOrDefault(d => d.DataType == Constants.AppOwnedDataModelName);
                var second = instance.Data.FirstOrDefault(d => d.DataType == "Fast_Statistikk_Kopi");
                if (first != null)
                    await DeleteDataModel(Constants.AppOwnedDataModelName, instance);
                if (second != null)
                {
                    await DeleteDataModel("Fast_Statistikk_Kopi", instance);
                }
            }

            private async Task DeleteDataModel(string dataModelName, Instance instance)
            {
                await dataClient.DeleteData(
                    int.Parse(instance.InstanceOwner.PartyId),
                    new Guid(instance.Id.Split("/")[1]),
                    new Guid(instance.Data.First(de => de.DataType == dataModelName).Id),
                    false
                );
            }
        """;

    [Fact]
    public void SetsAutoDeleteOnEachDataType_WhenTheHookDeletesSeveral()
    {
        var hook = Hook(TwoDataTypesMembers);
        var metadata = Metadata(others: SecondAppOwned);
        var scanner = Scanner(hook, metadata: metadata);

        var result = Apply(scanner);

        Assert.Equal([Set(), Set("Fast_Statistikk_Kopi", "Task_2"), Deleted("those deletes")], result.Messages);
        Assert.Equal(AutoDeleted(AutoDeleted(metadata), "Fast_Statistikk_Kopi"), _app.Read(MetadataPath));
        Assert.False(File.Exists(Path.Combine(AppFolder, HookPath)));
    }

    [Theory]
    [InlineData("\"allowedContributers\"", "\"allowedContributors\"")]
    [InlineData("\"appLogic\"", "\"AppLogic\"")]
    [InlineData("\"autoDeleteOnProcessEnd\"", "\"AutoDeleteOnProcessEnd\"")]
    public void SetsAutoDelete_HoweverTheMetadataSpellsIt(string spelling, string respelled)
    {
        var scanner = Scanner(metadata: Metadata(AppOwnedProperties.Replace(spelling, respelled)));

        var result = Apply(scanner);

        Assert.Equal([Set(), Deleted()], result.Messages);
        Assert.Equal(
            Metadata(
                AppOwnedProperties
                    .Replace("\"autoDeleteOnProcessEnd\": false", "\"autoDeleteOnProcessEnd\": true")
                    .Replace(spelling, respelled)
            ),
            _app.Read(MetadataPath)
        );
    }

    /// <summary>The neighbour with look-alikes of the Altinn and .NET members the scenario takes.</summary>
    private const string LookAlikes = """
        using System;
        using System.Threading.Tasks;
        using Altinn.App.Core.Models;
        using Altinn.Platform.Storage.Interface.Models;

        namespace Altinn.App.Logic.TaskProcessors;

        public class ProcessTaskEnd { }

        public static class Numbers
        {
            public static int Parse(string number) => 0;
        }

        public class Identifier(Instance instance)
        {
            public Guid InstanceGuid => Guid.Empty;
        }

        public interface IMetadata
        {
            Task<ApplicationMetadata> GetApplicationMetadata();
        }

        public interface IClient
        {
            Task<bool> DeleteData(int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, bool delay);
        }
        """;

    /// <summary>A hook that differs from the scenario in one respect each, and the app around it.</summary>
    public static TheoryData<string, string, string?> UnmatchedCode =>
        new()
        {
            {
                "End does more",
                Hook(
                    FaststatistikkMembers.Replace(
                        "        if (appOwnedDataElement != null)",
                        "        await Task.Delay(1);\n\n        if (appOwnedDataElement != null)"
                    )
                ),
                null
            },
            {
                "the helper does more",
                Hook(
                    FaststatistikkMembers.Replace(
                        "            false\n        );",
                        "            false\n        );\n        await Task.Delay(1);"
                    )
                ),
                null
            },
            {
                "the if has an else",
                Hook(
                    FaststatistikkMembers.Replace(
                        "            await DeleteDataModel(Constants.AppOwnedDataModelName, instance);\n        }",
                        "            await DeleteDataModel(Constants.AppOwnedDataModelName, instance);\n        }\n        else\n        {\n            await Task.Delay(1);\n        }"
                    )
                ),
                null
            },
            {
                "the if tests something else",
                Hook(FaststatistikkMembers.Replace("if (appOwnedDataElement != null)", "if (instance.Id != null)")),
                null
            },
            {
                "the if tests otherwise",
                Hook(
                    FaststatistikkMembers.Replace(
                        "if (appOwnedDataElement != null)",
                        "if (appOwnedDataElement == null)"
                    )
                ),
                null
            },
            {
                "the element is read without its if",
                Hook(
                    FastbudsjettMembers
                        .Replace("if (appOwnedDataElement != null)\n        {", "")
                        .Replace(
                            "new Guid(appOwnedDataElement.Id), false);\n        }",
                            "new Guid(appOwnedDataElement.Id), false);"
                        ),
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the helper's element is found without the if",
                Hook(
                    FaststatistikkMembers
                        .Replace("if (appOwnedDataElement != null)\n        {", "")
                        .Replace("instance);\n        }\n    }", "instance);\n    }")
                ),
                null
            },
            {
                "the if found another data type",
                Hook(
                    FaststatistikkMembers.Replace(
                        "dataElement.DataType == Constants.AppOwnedDataModelName",
                        "dataElement.DataType == Constants.MainDataModelName"
                    )
                ),
                null
            },
            {
                "the element is found with First outside its if",
                Hook(
                    FaststatistikkMembers.Replace(
                        "        if (appOwnedDataElement != null)",
                        "        var first = instance.Data.First(d => d.DataType == Constants.AppOwnedDataModelName);\n\n        if (appOwnedDataElement != null)"
                    )
                ),
                null
            },
            {
                "the element is found by another property",
                Hook(FaststatistikkMembers.Replace("de.DataType == dataModelName", "de.Id == dataModelName")),
                null
            },
            {
                "the element is found by another comparison",
                Hook(FaststatistikkMembers.Replace("de.DataType == dataModelName", "de.DataType != dataModelName")),
                null
            },
            {
                "the element is found with another method",
                Hook(FaststatistikkMembers.Replace("instance.Data.First(", "instance.Data.Last(")),
                null
            },
            {
                "the element is found with another First",
                Hook(),
                "namespace Altinn.App.Logic.TaskProcessors\n{\n    using System;\n    using System.Collections.Generic;\n\n"
                    + "    public class ProcessTaskEnd { }\n\n    public static class Firsts\n    {\n"
                    + "        public static T First<T>(this List<T> items, Func<T, bool> predicate) => items[0];\n"
                    + "    }\n}\n"
            },
            {
                "the element is found in another instance",
                Hook(
                    FaststatistikkMembers.Replace(
                        "new Guid(instance.Data.First(",
                        "new Guid(new Instance().Data.First("
                    )
                ),
                null
            },
            {
                "the data type is not a constant",
                Hook(
                    FaststatistikkMembers.Replace(
                        "await DeleteDataModel(Constants.AppOwnedDataModelName, instance);",
                        "await DeleteDataModel(instance.Id, instance);"
                    )
                ),
                null
            },
            {
                "the helper is passed a default",
                Hook(
                    FaststatistikkMembers
                        .Replace(
                            "DeleteDataModel(Constants.AppOwnedDataModelName, instance);",
                            "DeleteDataModel(instance);"
                        )
                        .Replace(
                            "DeleteDataModel(string dataModelName, Instance instance)",
                            "DeleteDataModel(Instance instance, string dataModelName = Constants.AppOwnedDataModelName)"
                        )
                ),
                null
            },
            {
                "the helper calls itself",
                Hook(
                    FaststatistikkMembers.Replace(
                        "            false\n        );",
                        "            false\n        );\n        await DeleteDataModel(dataModelName, instance);"
                    )
                ),
                null
            },
            {
                "the hook awaits another method than its helper",
                Hook(
                    FastbudsjettMembers.Replace(
                        "        if (appOwnedDataElement != null)",
                        "        await Task.Yield();\n\n        if (appOwnedDataElement != null)"
                    ) + "\n\n    private async Task Nothing() { }",
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the element is found by another element's data type",
                Hook(
                    FaststatistikkMembers
                        .Replace(
                            "await DeleteDataModel(Constants.AppOwnedDataModelName, instance);",
                            "await DeleteDataModel(Constants.AppOwnedDataModelName, instance, appOwnedDataElement);"
                        )
                        .Replace(
                            "DeleteDataModel(string dataModelName, Instance instance)",
                            "DeleteDataModel(string dataModelName, Instance instance, DataElement found)"
                        )
                        .Replace("de => de.DataType == dataModelName", "de => found.DataType == dataModelName")
                ),
                null
            },
            {
                "the delete is delayed",
                Hook(FaststatistikkMembers.Replace("            false\n        );", "            true\n        );")),
                null
            },
            {
                "the delete passes an authentication method",
                Hook(
                    FaststatistikkMembers.Replace(
                        "            false\n        );",
                        "            false,\n            null\n        );"
                    )
                ),
                null
            },
            {
                "a local holds something else",
                Hook(
                    FaststatistikkMembers.Replace(
                        "        if (appOwnedDataElement != null)",
                        "        var removed = instance.Data.Remove(instance.Data[0]);\n\n        if (appOwnedDataElement != null)"
                    )
                ),
                null
            },
            {
                "the if tests the data type's name",
                Hook(
                    FaststatistikkMembers.Replace(
                        "        if (appOwnedDataElement != null)",
                        "        var name = Constants.AppOwnedDataModelName;\n\n        if (name != null)"
                    )
                ),
                null
            },
            {
                "the if compares with something else",
                Hook(
                    FaststatistikkMembers.Replace(
                        "if (appOwnedDataElement != null)",
                        "if (appOwnedDataElement != instance.Data[0])"
                    )
                ),
                null
            },
            {
                "the delete is of another number of the party",
                Hook(
                    FaststatistikkMembers.Replace(
                        "int.Parse(instance.InstanceOwner.PartyId)",
                        "int.Parse(instance.InstanceOwner.OrganisationNumber)"
                    )
                ),
                null
            },
            {
                "the instance guid is split from another property",
                Hook(
                    FaststatistikkMembers.Replace(
                        "new Guid(instance.Id.Split(\"/\")[1])",
                        "new Guid(instance.AppId.Split(\"/\")[1])"
                    )
                ),
                null
            },
            {
                "the delete is on another client",
                Hook(declaration: FaststatistikkDeclaration.Replace("IDataClient", "IClient")),
                LookAlikes
            },
            {
                "the delete is of another party's number",
                Hook(
                    FaststatistikkMembers.Replace(
                        "int.Parse(instance.InstanceOwner.PartyId)",
                        "int.Parse(new Instance().InstanceOwner.PartyId)"
                    )
                ),
                null
            },
            {
                "the delete is of another instance",
                Hook(
                    FaststatistikkMembers.Replace(
                        "new Guid(instance.Id.Split(\"/\")[1])",
                        "new Guid(instance.Id.Split(\"/\")[0])"
                    )
                ),
                null
            },
            {
                "the instance id is split otherwise",
                Hook(
                    FaststatistikkMembers.Replace(
                        "new Guid(instance.Id.Split(\"/\")[1])",
                        "new Guid(instance.Id.Split(\"-\")[1])"
                    )
                ),
                null
            },
            {
                "the instance id is of another instance",
                Hook(
                    FaststatistikkMembers.Replace(
                        "new Guid(instance.Id.Split(\"/\")[1])",
                        "new Guid(new Instance().Id.Split(\"/\")[1])"
                    )
                ),
                null
            },
            {
                "the delete is of another element",
                Hook(
                    FaststatistikkMembers.Replace(
                        ".First(de => de.DataType == dataModelName).Id)",
                        ".First(de => de.DataType == dataModelName).InstanceGuid)"
                    )
                ),
                null
            },
            {
                "the party is parsed by another method",
                Hook(
                    FaststatistikkMembers.Replace(
                        "int.Parse(instance.InstanceOwner.PartyId)",
                        "Numbers.Parse(instance.InstanceOwner.PartyId)"
                    )
                ),
                LookAlikes
            },
            {
                "the instance identifier is another type",
                Hook(
                    FastbudsjettMembers
                        .Replace("new InstanceIdentifier(instance);", "new Identifier(instance);")
                        .Replace("InstanceIdentifier instanceIdentifier", "Identifier instanceIdentifier"),
                    FastbudsjettDeclaration
                ),
                LookAlikes
            },
            {
                "the app metadata comes from another service",
                Hook(FastbudsjettMembers.Replace("IAppMetadata", "IMetadata"), FastbudsjettDeclaration),
                LookAlikes
            },
            {
                "the instance identifier is of another instance",
                Hook(
                    FastbudsjettMembers.Replace("new InstanceIdentifier(instance)", "new InstanceIdentifier(\"1/2\")"),
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the instance guid is another property",
                Hook(
                    FastbudsjettMembers.Replace(
                        "instanceIdentifier.InstanceGuid",
                        "Guid.Parse(instanceIdentifier.GetInstanceId())"
                    ),
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the org is another value",
                Hook(
                    FastbudsjettMembers.Replace("appIdentifier.Org, appIdentifier.App", "\"nkr\", appIdentifier.App"),
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the app is another value",
                Hook(
                    FastbudsjettMembers.Replace(
                        "appIdentifier.Org, appIdentifier.App",
                        "appIdentifier.Org, appIdentifier.Org"
                    ),
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the org is another app's",
                Hook(
                    FastbudsjettMembers
                        .Replace("_appMetadata.GetApplicationMetadata()", "_shared.GetApplicationMetadata()")
                        .Replace(
                            "private readonly IAppMetadata _appMetadata;",
                            "private readonly IAppMetadata _appMetadata;\n        private static IAppMetadata _shared;"
                        ),
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the delete is on a static field",
                Hook(
                    FastbudsjettMembers
                        .Replace("_dataClient.DeleteData", "_shared.DeleteData")
                        .Replace(
                            "private readonly IDataClient _dataClient;",
                            "private readonly IDataClient _dataClient;\n        private static IDataClient _shared;"
                        ),
                    FastbudsjettDeclaration
                ),
                null
            },
            {
                "the hook calls another IDataClient method",
                Hook(
                    FaststatistikkMembers
                        .Replace("await dataClient.DeleteData(", "await dataClient.GetDataBytes(")
                        .Replace("            false\n        );", "            null\n        );")
                ),
                null
            },
            {
                "the hook deletes a data type twice",
                Hook(
                    FaststatistikkMembers.Replace(
                        "await DeleteDataModel(Constants.AppOwnedDataModelName, instance);",
                        "await DeleteDataModel(Constants.AppOwnedDataModelName, instance);\n            await DeleteDataModel(Constants.AppOwnedDataModelName, instance);"
                    )
                ),
                null
            },
            {
                "the hook deletes nothing",
                Hook(
                    FaststatistikkMembers.Replace(
                        "await DeleteDataModel(Constants.AppOwnedDataModelName, instance);",
                        ""
                    )
                ),
                null
            },
        };

    [Theory]
    [MemberData(nameof(UnmatchedCode))]
    public void LeavesTheAppAlone_WhenTheHookIsNotTheScenario(string because, string hook, string? neighbour)
    {
        var scanner = Scanner(hook, others: neighbour is null ? [] : [(NeighbourPath, neighbour)]);
        var before = Files();

        var result = Apply(scanner);

        Assert.True(result.Messages.Count == 0, because);
        Assert.Equal(before, Files());
    }

    /// <summary>applicationmetadata.json that does not let v9 delete the data type at process end instead.</summary>
    public static TheoryData<string, string> UnmatchedConfiguration =>
        new()
        {
            {
                "the users may change the data type",
                Metadata(AppOwnedProperties.Replace("\"app:owned\"", "\"app:owned\",\n        \"org:nkr\""))
            },
            { "the data type is not app-owned", Metadata(AppOwnedProperties.Replace("\"app:owned\"", "\"org:nkr\"")) },
            {
                "the data type has no contributors",
                Metadata(
                    AppOwnedProperties.Replace("\"allowedContributers\": [\n        \"app:owned\"\n      ],\n", "")
                )
            },
            {
                "the data type has both spellings of contributors",
                Metadata(
                    AppOwnedProperties.Replace(
                        "\"allowedContributers\":",
                        "\"allowedContributors\": [\"app:owned\"],\n      \"allowedContributers\":"
                    )
                )
            },
            {
                "the data type may have more elements",
                Metadata(AppOwnedProperties.Replace("\"maxCount\": 1,", "\"maxCount\": 0,"))
            },
            {
                "the data type's maxCount is not a number",
                Metadata(AppOwnedProperties.Replace("\"maxCount\": 1,", "\"maxCount\": \"1\","))
            },
            {
                "the data type has two maxCount",
                Metadata(AppOwnedProperties.Replace("\"maxCount\": 1,", "\"maxCount\": 1,\n      \"MaxCount\": 1,"))
            },
            {
                "the data type is bound to no task",
                Metadata(AppOwnedProperties.Replace("\"taskId\": \"Task_1\",\n", ""))
            },
            {
                "the data type's taskId is empty",
                Metadata(AppOwnedProperties.Replace("\"taskId\": \"Task_1\",", "\"taskId\": \"\","))
            },
            {
                "the data type has no appLogic",
                Metadata(
                    AppOwnedProperties.Replace(
                        AppOwnedProperties[
                            AppOwnedProperties.IndexOf("      \"appLogic\"", StringComparison.Ordinal)..(
                                AppOwnedProperties.IndexOf("},", StringComparison.Ordinal) + 3
                            )
                        ],
                        ""
                    )
                )
            },
            {
                "the data type has no autoDeleteOnProcessEnd",
                Metadata(AppOwnedProperties.Replace("    \"autoDeleteOnProcessEnd\": false,\n", ""))
            },
            {
                "the data type is deleted at process end already",
                Metadata(
                    AppOwnedProperties.Replace(
                        "\"autoDeleteOnProcessEnd\": false,",
                        "\"autoDeleteOnProcessEnd\": true,"
                    )
                )
            },
        };

    [Theory]
    [MemberData(nameof(UnmatchedConfiguration))]
    public void LeavesTheAppAlone_WhenTheConfigurationDoesNotFit(string because, string metadata)
    {
        var scanner = Scanner(metadata: metadata);
        var before = Files();

        var result = Apply(scanner);

        Assert.True(result.Messages.Count == 0, because);
        Assert.Equal(before, Files());
    }

    [Fact]
    public void LeavesTheHookAlone_WhenOneOfItsDataTypesDoesNotFit()
    {
        var scanner = Scanner(
            Hook(TwoDataTypesMembers),
            metadata: Metadata(others: SecondAppOwned.Replace("\"maxCount\": 1", "\"maxCount\": 0"))
        );
        var before = Files();

        var result = Apply(scanner);

        Assert.Empty(result.Messages);
        Assert.Equal(before, Files());
    }

    [Fact]
    public void LeavesBothHooksAlone_WhenTwoDeleteTheSameDataType()
    {
        var second = Hook().Replace("class ProcessEnd(", "class SecondProcessEnd(");
        var scanner = Scanner(
            program: Program(Registration, "services.AddTransient<IProcessEnd, SecondProcessEnd>();"),
            others: ("logic/TaskProcessors/SecondProcessEnd.cs", second)
        );
        var before = Files();

        var result = Apply(scanner);

        Assert.Empty(result.Messages);
        Assert.Equal(before, Files());
    }
}
