using System.Reflection;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

namespace LocalTest.Tests.Storage;

// Forwards to another repository and runs an action each time GetOne has read the instance.
internal class AfterGetOneInstanceRepository : DispatchProxy
{
    private IInstanceRepository _inner = null!;
    private Func<Task> _afterGetOne = null!;

    public static IInstanceRepository Create(IInstanceRepository inner, Func<Task> afterGetOne)
    {
        IInstanceRepository proxy = Create<IInstanceRepository, AfterGetOneInstanceRepository>();
        var repository = (AfterGetOneInstanceRepository)proxy;
        repository._inner = inner;
        repository._afterGetOne = afterGetOne;
        return proxy;
    }

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        object? result = targetMethod!.Invoke(_inner, args);
        return targetMethod.Name == nameof(IInstanceRepository.GetOne)
            ? AfterGetOne((Task<(Instance Instance, long InternalId)>)result!)
            : result;
    }

    private async Task<(Instance Instance, long InternalId)> AfterGetOne(
        Task<(Instance Instance, long InternalId)> getOne
    )
    {
        (Instance Instance, long InternalId) read = await getOne;
        await _afterGetOne();
        return read;
    }
}
