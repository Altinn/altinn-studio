using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Features;

public class InstantiationProcessorTests
{
    private sealed class LegacyInstantiationProcessor : IInstantiationProcessor
    {
        public Instance? Instance { get; private set; }
        public object? Data { get; private set; }
        public Dictionary<string, string>? Prefill { get; private set; }

        public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
        {
            Instance = instance;
            Data = data;
            Prefill = prefill;
            return Task.CompletedTask;
        }
    }

    private sealed class MutatorInstantiationProcessor : IInstantiationProcessor
    {
        public IInstanceDataMutator? InstanceDataMutator { get; private set; }
        public object? Data { get; private set; }
        public Dictionary<string, string>? Prefill { get; private set; }

        public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
            throw new InvalidOperationException("The mutator overload is the one implemented");

        public Task DataCreation(
            IInstanceDataMutator instanceDataMutator,
            object data,
            Dictionary<string, string>? prefill
        )
        {
            InstanceDataMutator = instanceDataMutator;
            Data = data;
            Prefill = prefill;
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task DataCreation_MutatorOverload_DelegatesToTheInstanceOverloadByDefault()
    {
        var instance = new Instance();
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);
        var data = new object();
        var prefill = new Dictionary<string, string> { ["key"] = "value" };
        var processor = new LegacyInstantiationProcessor();

        await ((IInstantiationProcessor)processor).DataCreation(mutatorMock.Object, data, prefill);

        Assert.Same(instance, processor.Instance);
        Assert.Same(data, processor.Data);
        Assert.Same(prefill, processor.Prefill);
    }

    [Fact]
    public async Task DataCreation_ContextOverload_DelegatesToTheMutatorOverloadByDefault()
    {
        var mutator = Mock.Of<IInstanceDataMutator>();
        var data = new object();
        var prefill = new Dictionary<string, string> { ["key"] = "value" };
        var processor = new MutatorInstantiationProcessor();

        await ((IInstantiationProcessor)processor).DataCreation(
            new DataCreationContext
            {
                InstanceDataMutator = mutator,
                Data = data,
                Prefill = prefill,
                Actor = new Actor { UserId = 1337 },
            }
        );

        Assert.Same(mutator, processor.InstanceDataMutator);
        Assert.Same(data, processor.Data);
        Assert.Same(prefill, processor.Prefill);
    }
}
