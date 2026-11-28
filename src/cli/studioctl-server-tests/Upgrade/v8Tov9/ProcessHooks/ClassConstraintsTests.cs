using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// <c>ReplaceFormData&lt;T&gt;</c> takes a class: a helper that writes a form of its own type parameter gets a class
/// constraint on it. <see cref="MutatorThreadingTests"/> has the helper behind an app interface.
/// </summary>
public sealed class ClassConstraintsTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string, string, string> Constraints =>
        new()
        {
            // brg/stottetildeling-ny App/logic/TaskProcessors/ProcessTaskEnd.cs:297-301.
            { "none", "T", "Model", "", " where T : class" },
            { "notnull, which class replaces", "T", "Model", " where T : notnull", " where T : class" },
            { "another constraint, which stays", "T", "Model", " where T : new()", " where T : class, new()" },
            { "a class constraint already", "T", "Model", " where T : class", " where T : class" },
            {
                "a constraint on another type parameter only",
                "TOther, T",
                "int, Model",
                " where TOther : struct",
                " where TOther : struct where T : class"
            },
        };

    [Theory]
    [MemberData(nameof(Constraints))]
    public void AHelperThatWritesAFormOfItsTypeParameter_GetsAClassConstraintOnIt(
        string label,
        string typeParameters,
        string typeArguments,
        string before,
        string after
    )
    {
        _ = label;
        _app.Write(
            HookPath,
            InApp(
                $$"""
                public class Model { }

                public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        await Save<{{typeArguments}}>(new Model(), "model", instance);
                    }

                    private async Task Save<{{typeParameters}}>(T model, string dataType, Instance instance){{before}}
                    {
                        var dataElement = instance.Data.First(d => d.DataType == dataType);
                        await dataClient.UpdateFormData(instance, model, dataElement);
                    }
                }
                """
            )
        );

        Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class Model { }

                public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                {
                    public bool ShouldRunForTask(string taskId) => true;

                    public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                    {
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        await Save<{{typeArguments}}>(new Model(), "model", dataMutator);
                        return {{HandlerResult}}.Success();
                    }

                    private async Task Save<{{typeParameters}}>(T model, string dataType, {{IInstanceDataMutator}} dataMutator){{after}}
                    {
                        Instance instance = dataMutator.Instance;
                        var dataElement = instance.Data.First(d => d.DataType == dataType);
                        await dataMutator.ReplaceFormData(dataElement, model);
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void AnotherImplementationOfTheHelpersInterfaceMember_GetsTheConstraintToo()
    {
        _app.Write(
            HookPath,
            InApp(
                """
                public class Model { }

                public interface IStore
                {
                    Task Save<T>(T model, string dataType, Instance instance);
                }

                public class Store(IDataClient dataClient) : IStore
                {
                    public async Task Save<T>(T model, string dataType, Instance instance)
                    {
                        var dataElement = instance.Data.First(d => d.DataType == dataType);
                        await dataClient.UpdateFormData(instance, model!, dataElement);
                    }
                }

                public class NoStore : IStore
                {
                    public Task Save<T>(T model, string dataType, Instance instance) => Task.CompletedTask;
                }

                public class ProcessTaskEnd(IStore store) : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        await store.Save(new Model(), "model", instance);
                    }
                }
                """
            )
        );

        Port(AppFolder);

        Assert.Contains(
            $"public Task Save<T>(T model, string dataType, {IInstanceDataMutator} dataMutator) where T : class => Task.CompletedTask;",
            _app.Read(HookPath),
            StringComparison.Ordinal
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void ATypeParameterOfTheClass_LeavesTheMethodsOwnTypeParametersAlone()
    {
        _app.Write(
            HookPath,
            InApp(
                """
                public class Model { }

                public class Store<T>(IDataClient dataClient)
                {
                    public async Task Save<TKey>(TKey key, T model, Instance instance) where TKey : notnull
                    {
                        var dataElement = instance.Data.First(d => d.DataType == key.ToString());
                        await dataClient.UpdateFormData(instance, model!, dataElement);
                    }
                }

                public class ProcessTaskEnd(Store<Model> store) : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        await store.Save("model", new Model(), instance);
                    }
                }
                """
            )
        );

        Port(AppFolder);

        Assert.Contains(
            $"public async Task Save<TKey>(TKey key, T model, {IInstanceDataMutator} dataMutator) where TKey : notnull",
            _app.Read(HookPath),
            StringComparison.Ordinal
        );
    }
}
