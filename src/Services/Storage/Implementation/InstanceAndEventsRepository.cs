using System.Data;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Represents an implementation of <see cref="IInstanceAndEventsRepository"/>.
/// </summary>
public class InstanceAndEventsRepository : IInstanceAndEventsRepository 
{
    private readonly ILogger<InstanceAndEventsRepository> _logger;
    private readonly IInstanceRepository _instanceRepository;
    private readonly IInstanceEventRepository _instanceEventRepository;

    /// <summary>
    /// Initializes a new instance of the <see cref="InstanceAndEventsRepository"/> class.
    /// </summary>
    /// <param name="logger">The logger to use when writing to logs.</param>
    /// <param name="instanceRepository">Instance repo</param>
    public InstanceAndEventsRepository(
        ILogger<InstanceAndEventsRepository> logger,
        IInstanceRepository instanceRepository,
        IInstanceEventRepository instanceEventRepository)
    {
        _logger = logger;
        _instanceRepository = instanceRepository;
        _instanceEventRepository = instanceEventRepository;
    }

    /// <inheritdoc/>
    public async Task<Instance> Update(Instance instance, List<string> updateProperties, List<InstanceEvent> events)
    {
        instance = await _instanceRepository.Update(instance);
        foreach (var instanceEvent in events)
        {
            await _instanceEventRepository.InsertInstanceEvent(instanceEvent);
        }

        return instance;
    }
}
