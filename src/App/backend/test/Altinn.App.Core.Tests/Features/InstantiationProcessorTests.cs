using Altinn.App.Core.Features;
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
}
