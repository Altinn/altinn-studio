using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// A form read from one data type, changed, and written to another only: v8 left the element it was read from as it
/// was, v9 saves the changes there too, and the write gets a to-do.
/// </summary>
public sealed class OtherElementWritesTests : IDisposable
{
    private const string Helpers = """
            private async Task<T> GetDataModel<T>(string dataModelName, Instance instance) where T : class
            {
                var dataElement = instance.Data.First(de => de.DataType == dataModelName);
                var formData = await dataClient.GetFormData(instance, dataElement);
                return formData as T ?? throw new NullReferenceException();
            }

            private async Task UpdateDataModel<T>(T dataModel, string dataModelName, Instance instance)
            {
                var dataElement = instance.Data.First(de => de.DataType == dataModelName);
                await dataClient.UpdateFormData(instance, dataModel, dataElement);
            }
        """;

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    /// <summary>A task end hook with <paramref name="body"/> and <paramref name="members"/>.</summary>
    private static string Hook(string body, string members = "") =>
        $$"""
            public class Model { public string? Shadow { get; set; } }

            public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    var main = instance.Data.First(d => d.DataType == "datamodel");
                    var copy = instance.Data.First(d => d.DataType == "copy");
            {{body}}
                }
            {{members}}
            }
            """;

    public static TheoryData<string, string, string> Reported =>
        new()
        {
            {
                // brg/stottetildeling-ny App/logic/TaskProcessors/ProcessTaskEnd.cs:54-60.
                "read and written through helpers that take the data type",
                Hook(
                    """
                            var schema = await GetDataModel<Model>("datamodel", instance);
                            schema.Shadow = null;
                            await UpdateDataModel(schema, "copy", instance);
                    """,
                    Helpers
                ),
                "await UpdateDataModel(schema, \"copy\", instance);"
            },
            {
                "read and written in the method itself",
                Hook(
                    """
                            var schema = (Model)await dataClient.GetFormData(instance, main);
                            schema.Shadow = null;
                            await dataClient.UpdateFormData(instance, schema, copy);
                    """
                ),
                "await dataClient.UpdateFormData(instance, schema, copy);"
            },
            {
                "written back to its own element before the change",
                Hook(
                    """
                            var schema = (Model)await dataClient.GetFormData(instance, main);
                            await dataClient.UpdateFormData(instance, schema, main);
                            schema.Shadow = null;
                            await dataClient.UpdateFormData(instance, schema, copy);
                    """
                ),
                "await dataClient.UpdateFormData(instance, schema, copy);"
            },
        };

    [Theory]
    [MemberData(nameof(Reported))]
    public void AFormChangedAndWrittenToAnotherDataTypeOnly_GetsATodoAtTheWrite(
        string label,
        string source,
        string write
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Contains(
            At(
                source,
                write,
                UpgradeMessageStatus.Todo,
                "schema is read from datamodel, changed and written to copy. v8 saved the changes in copy only; v9 saves them in datamodel too, since dataMutator.GetFormData returns the model the transition saves. To keep datamodel as it was, write schema to copy before changing it, and change the object ReplaceFormData returns."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    public static TheoryData<string, string> NotReported =>
        new()
        {
            {
                "written back to its own element after the change",
                Hook(
                    """
                            var schema = (Model)await dataClient.GetFormData(instance, main);
                            schema.Shadow = null;
                            await dataClient.UpdateFormData(instance, schema, copy);
                            await dataClient.UpdateFormData(instance, schema, main);
                    """
                )
            },
            {
                "not changed before the write",
                Hook(
                    """
                            var schema = (Model)await dataClient.GetFormData(instance, main);
                            await dataClient.UpdateFormData(instance, schema, copy);
                    """
                )
            },
            {
                "written to the data type it was read from",
                Hook(
                    """
                            var schema = await GetDataModel<Model>("datamodel", instance);
                            schema.Shadow = null;
                            await UpdateDataModel(schema, "datamodel", instance);
                    """,
                    Helpers
                )
            },
            {
                "the local holds another object at the write",
                Hook(
                    """
                            var schema = (Model)await dataClient.GetFormData(instance, main);
                            schema = new Model();
                            schema.Shadow = "x";
                            await dataClient.UpdateFormData(instance, schema, copy);
                    """
                )
            },
            {
                "read through a helper that returns another object than it read",
                Hook(
                    """
                            var schema = await GetDataModel("datamodel", instance);
                            schema.Shadow = null;
                            await dataClient.UpdateFormData(instance, schema, copy);
                    """,
                    """
                        private async Task<Model> GetDataModel(string dataModelName, Instance instance)
                        {
                            var dataElement = instance.Data.First(de => de.DataType == dataModelName);
                            var formData = (Model)await dataClient.GetFormData(instance, dataElement);
                            return new Model { Shadow = formData.Shadow };
                        }
                    """
                )
            },
        };

    [Theory]
    [MemberData(nameof(NotReported))]
    public void AFormWrittenToAnotherDataType_GetsNoTodo_WhenV9SavesWhatV8Saved(string label, string source)
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.DoesNotContain(
            result.Messages,
            message => message.Text.Contains("changed and written to", StringComparison.Ordinal)
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void AFormWriteThatStays_SaysWhatReplaceFormDataCopies()
    {
        var source = Hook(
            """
                    var schema = new Model();
                    await dataClient.UpdateFormData(instance, schema, main);
            """
        );
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Contains(
            At(
                source,
                "await dataClient.UpdateFormData(instance, schema, main);",
                UpgradeMessageStatus.Warning,
                "IDataClient.UpdateFormData now replaces the form with dataMutator.ReplaceFormData, which copies schema as it is here into the element's form, as v8 saved it. If schema is the object dataMutator.GetFormData returned for this element, later changes to it are saved too."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }
}
