using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the removed <c>UserActionResult.AddUpdatedDataModel</c>/<c>UpdatedDataModels</c>. Rewrites migrate against
/// a v8 stub and then compile against a v9 stub.
/// </summary>
public sealed class UpdatedDataModelsMigrationTests : IDisposable
{
    private static readonly IReadOnlySet<string> _globalFeatures = new HashSet<string>(StringComparer.Ordinal)
    {
        "Altinn.App.Core.Features",
    };

    private readonly TempAppFolder _app = new();

    public UpdatedDataModelsMigrationTests()
    {
        // The implicit usings a v9 app project gets, which the stub compilation does not add on its own.
        _app.Write(
            "GlobalUsings.cs",
            """
            global using System;
            global using System.Collections.Generic;
            global using System.Threading.Tasks;
            """
        );
    }

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private const string CommonStubSource = """
        namespace Altinn.Platform.Storage.Interface.Models
        {
            public class Instance { }
        }

        namespace Altinn.App.Core.Models
        {
            public readonly struct DataElementIdentifier
            {
                public DataElementIdentifier(string id) { }
            }
        }

        namespace Altinn.App.Core.Features
        {
            public interface IInstanceDataMutator
            {
                Altinn.Platform.Storage.Interface.Models.Instance Instance { get; }
                System.Threading.Tasks.Task<object> GetFormData(Altinn.App.Core.Models.DataElementIdentifier id);
            }

            public interface IUserAction
            {
                string Id { get; }
                System.Threading.Tasks.Task<Altinn.App.Core.Models.UserAction.UserActionResult> HandleAction(
                    Altinn.App.Core.Models.UserAction.UserActionContext context);
            }
        }
        """;

    private static readonly Lazy<MetadataReference> _v8Stub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            CommonStubSource
                + """

                namespace Altinn.App.Core.Models.UserAction
                {
                    public sealed class UserActionResult
                    {
                        public static UserActionResult SuccessResult() => new();
                        public System.Collections.Generic.Dictionary<string, object>? UpdatedDataModels { get; set; }
                        public void AddUpdatedDataModel(string dataModelId, object dataModel) { }
                    }

                    public class UserActionContext
                    {
                        public UserActionContext(Altinn.App.Core.Features.IInstanceDataMutator dataMutator, int? userId, string? buttonId = null) =>
                            DataMutator = dataMutator;
                        public UserActionContext(Altinn.Platform.Storage.Interface.Models.Instance instance, int? userId, string? buttonId = null) =>
                            DataMutator = null!;
                        public Altinn.App.Core.Features.IInstanceDataMutator DataMutator { get; }
                    }
                }
                """
        )
    );

    private static readonly Lazy<MetadataReference> _v9Stub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            CommonStubSource
                + """

                namespace Altinn.App.Core.Features
                {
                    public static class IInstanceDataMutatorExtensions
                    {
                        public static System.Threading.Tasks.Task ReplaceFormData(
                            this IInstanceDataMutator dataMutator,
                            Altinn.App.Core.Models.DataElementIdentifier dataElementIdentifier,
                            object model) => System.Threading.Tasks.Task.CompletedTask;
                    }
                }

                namespace Altinn.App.Core.Models.UserAction
                {
                    public sealed class UserActionResult
                    {
                        public static UserActionResult SuccessResult() => new();
                    }

                    public class UserActionContext
                    {
                        public UserActionContext(Altinn.App.Core.Features.IInstanceDataMutator dataMutator, int? userId, string? buttonId = null) =>
                            DataMutator = dataMutator;
                        public Altinn.App.Core.Features.IInstanceDataMutator DataMutator { get; }
                    }
                }
                """
        )
    );

    private static readonly Lazy<MetadataReference> _apiStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Api",
            """
            namespace Altinn.App.Api.Models
            {
                public class UserActionResponse
                {
                    public System.Collections.Generic.Dictionary<string, object>? UpdatedDataModels { get; set; }
                }
            }
            """
        )
    );

    private CSharpSourceScanner SemanticScanner() =>
        SemanticScannerFactory.CreateScanner(AppFolder, _v8Stub.Value, _apiStub.Value);

    private void AssertCompilesAgainstV9() =>
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, _v9Stub.Value));

    private const string ActionSource = """
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Models.UserAction;

        public class FillAction : IUserAction
        {
            public string Id => "fill";

            public async Task<UserActionResult> HandleAction(UserActionContext context)
            {
                var model = await context.DataMutator.GetFormData(new Altinn.App.Core.Models.DataElementIdentifier("id"));
                var result = UserActionResult.SuccessResult();
                result.AddUpdatedDataModel("id", model);
                result.AddUpdatedDataModel(
                    dataModel: model,
                    dataModelId: "other"
                );
                return result;
            }
        }
        """;

    [Fact]
    public void WithSemantics_RewritesCallsInTheAction()
    {
        var action = _app.Write("logic/FillAction.cs", ActionSource);

        var result = new UpdatedDataModelsMigration(SemanticScanner(), _globalFeatures).Migrate();

        var migrated = File.ReadAllText(action);
        Assert.Contains(
            "await context.DataMutator.ReplaceFormData(new global::Altinn.App.Core.Models.DataElementIdentifier(\"id\"), model);",
            migrated
        );
        Assert.Contains(
            "await context.DataMutator.ReplaceFormData(new global::Altinn.App.Core.Models.DataElementIdentifier(\"other\"), model);",
            migrated
        );
        Assert.DoesNotContain("AddUpdatedDataModel", migrated);
        Assert.Contains(
            "        // Not needed if the model came from DataMutator.GetFormData, which tracks its changes.\n"
                + "        await context.DataMutator.ReplaceFormData(new global::Altinn.App.Core.Models.DataElementIdentifier(\"id\"), model);",
            migrated.Replace("\r\n", "\n", StringComparison.Ordinal)
        );
        // Altinn.App.Core.Features is already imported, globally and by the file.
        Assert.Single(migrated.Split("using Altinn.App.Core.Features;")[1..]);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(
            result.Warnings,
            static w =>
                w.Contains(
                    "FillAction.cs:12: result.AddUpdatedDataModel(..) -> await context.DataMutator.ReplaceFormData(..)",
                    StringComparison.Ordinal
                )
        );
        AssertCompilesAgainstV9();
    }

    [Fact]
    public void WithSemantics_KeepsTheLayoutOfAMultiLineCall()
    {
        var action = _app.Write(
            "logic/Action.cs",
            """
            using Altinn.App.Core.Models.UserAction;

            public class Action
            {
                public async Task<UserActionResult> Run(UserActionContext ctx, object model)
                {
                    var result = UserActionResult.SuccessResult();
                    result.AddUpdatedDataModel(
                        "id",
                        model
                    );
                    return result;
                }
            }
            """
        );

        new UpdatedDataModelsMigration(SemanticScanner(), _globalFeatures).Migrate();

        Assert.Contains(
            """
                    await ctx.DataMutator.ReplaceFormData(
                        new global::Altinn.App.Core.Models.DataElementIdentifier("id"),
                        model
                    );
            """,
            File.ReadAllText(action)
        );
    }

    [Fact]
    public void WithSemantics_AddsTheUsingWhenTheNamespaceIsNotImported()
    {
        var action = _app.Write(
            "logic/Action.cs",
            """
            using Altinn.App.Core.Models.UserAction;

            public class Action
            {
                public async Task<UserActionResult> Handle(UserActionContext context, object model)
                {
                    var result = UserActionResult.SuccessResult();
                    result.AddUpdatedDataModel("id", model);
                    return result;
                }
            }
            """
        );

        new UpdatedDataModelsMigration(SemanticScanner(), new HashSet<string>()).Migrate();

        Assert.StartsWith(
            "using Altinn.App.Core.Models.UserAction;\nusing Altinn.App.Core.Features;\n\npublic class Action\n",
            File.ReadAllText(action).Replace("\r\n", "\n", StringComparison.Ordinal)
        );
        AssertCompilesAgainstV9();
    }

    [Fact]
    public void WithSemantics_ReportsWhatItCannotRewrite()
    {
        var action = _app.Write(
            "logic/Leftovers.cs",
            """
            using Altinn.App.Api.Models;
            using Altinn.App.Core.Models.UserAction;

            public class OwnResult
            {
                public void AddUpdatedDataModel(string id, object model) { }
            }

            public class Leftovers
            {
                public UserActionResult NotAsync(UserActionContext context, object model)
                {
                    var result = UserActionResult.SuccessResult();
                    result.AddUpdatedDataModel("id", model);
                    return result;
                }

                public async Task<UserActionResult> InLambda(UserActionContext context, object model)
                {
                    var result = UserActionResult.SuccessResult();
                    Action add = () => result.AddUpdatedDataModel("id", model);
                    add();
                    return result;
                }

                public async Task<UserActionResult> NoContext(object model)
                {
                    var result = UserActionResult.SuccessResult();
                    result.AddUpdatedDataModel("id", model);
                    return result;
                }

                public async Task<UserActionResult> NamedModelFirstWithEffect(
                    UserActionContext context,
                    object[] models,
                    string[] ids
                )
                {
                    var result = UserActionResult.SuccessResult();
                    var i = 0;
                    result.AddUpdatedDataModel(dataModel: models[i++], dataModelId: ids[i]);
                    return result;
                }

                public async Task<UserActionResult> ReceiverWithEffect(UserActionContext context, object model)
                {
                    UserActionResult.SuccessResult().AddUpdatedDataModel("id", model);
                    return new UserActionResult { UpdatedDataModels = new() { ["id"] = model } };
                }

                public int Count(UserActionResult result, UserActionResponse response, OwnResult own) =>
                    (result.UpdatedDataModels?.Count ?? 0) + (response.UpdatedDataModels?.Count ?? 0);

                public void Own(OwnResult own) => own.AddUpdatedDataModel("id", new object());
            }
            """
        );
        var before = File.ReadAllText(action);

        var result = new UpdatedDataModelsMigration(SemanticScanner(), _globalFeatures).Migrate();

        Assert.Equal(before, File.ReadAllText(action));
        Assert.True(result.RequiresManualFollowUp);
        Assert.Contains(
            result.Todos,
            static t => t.Contains("context.DataMutator.GetFormData", StringComparison.Ordinal)
        );
        var lines = result
            .Warnings.Where(static w => w.Contains("Leftovers.cs:", StringComparison.Ordinal))
            .Select(static w => w[w.IndexOf("Leftovers.cs:", StringComparison.Ordinal)..]);
        Assert.Equal(
            [
                "Leftovers.cs:14: AddUpdatedDataModel",
                "Leftovers.cs:21: AddUpdatedDataModel",
                "Leftovers.cs:29: AddUpdatedDataModel",
                "Leftovers.cs:41: AddUpdatedDataModel",
                "Leftovers.cs:47: AddUpdatedDataModel",
                "Leftovers.cs:48: UpdatedDataModels",
                "Leftovers.cs:52: UpdatedDataModels",
            ],
            lines
        );
    }

    [Fact]
    public void WithoutSemantics_ReportsAndRewritesNothing()
    {
        var action = _app.Write("logic/FillAction.cs", ActionSource);

        var result = new UpdatedDataModelsMigration(new CSharpSourceScanner(AppFolder), _globalFeatures).Migrate();

        Assert.Equal(ActionSource, File.ReadAllText(action));
        Assert.True(result.RequiresManualFollowUp);
        Assert.Equal(
            2,
            result.Warnings.Count(static w => w.Contains("AddUpdatedDataModel(2 arg)", StringComparison.Ordinal))
        );
    }

    [Fact]
    public void Rerun_FindsNothingLeftToDo()
    {
        _app.Write("logic/FillAction.cs", ActionSource);
        new UpdatedDataModelsMigration(SemanticScanner(), _globalFeatures).Migrate();

        var rerun = new UpdatedDataModelsMigration(new CSharpSourceScanner(AppFolder), _globalFeatures).Migrate();

        Assert.Empty(rerun.Messages);
    }
}
