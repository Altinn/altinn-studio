using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Service for initializing an <see cref="InstanceDataUnitOfWork"/> with all the services it needs.
/// </summary>
internal class InstanceDataUnitOfWorkInitializer
{
    private readonly IDataClient _dataClient;
    private readonly IInstanceClient _instanceClient;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly IAppResources _appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings;
    private readonly IAppMetadata _applicationMetadata;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public InstanceDataUnitOfWorkInitializer(
        IDataClient dataClient,
        IInstanceClient instanceClient,
        IAppMetadata applicationMetadata,
        ModelSerializationService modelSerializationService,
        IAppResources appResources,
        IOptions<FrontEndSettings> frontEndSettings
    )
    {
        _dataClient = dataClient;
        _instanceClient = instanceClient;
        _modelSerializationService = modelSerializationService;
        _appResources = appResources;
        _frontEndSettings = frontEndSettings;
        _applicationMetadata = applicationMetadata;
    }

    /// <summary>
    /// Initializes an <see cref="InstanceDataUnitOfWork"/> with all the services it needs.
    /// This is marked as internal so that this class can only be used internally. Even if it is public for usage (as a DI service) in public classes.
    /// </summary>
    internal async Task<InstanceDataUnitOfWork> Init(Instance instance, string? taskId, string? language)
    {
        var applicationMetadata = await _applicationMetadata.GetApplicationMetadata();
        return new InstanceDataUnitOfWork(
            instance,
            _dataClient,
            _instanceClient,
            applicationMetadata,
            _modelSerializationService,
            _appResources,
            _frontEndSettings,
            taskId,
            language
        );
    }
}
