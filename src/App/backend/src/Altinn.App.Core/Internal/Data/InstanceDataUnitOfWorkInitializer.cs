using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Service for initializing an <see cref="InstanceDataUnitOfWork"/> with all the services it needs.
/// </summary>
internal class InstanceDataUnitOfWorkInitializer
{
    private readonly IDataClientWithStorageMetadata _dataClient;
    private readonly IInstanceMutationClient _mutationClient;
    private readonly IInstanceClientWithStorageMetadata _instanceClient;
    private readonly ITranslationService _translationService;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly IAppResources _appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings;
    private readonly Telemetry? _telemetry;
    private readonly IAppMetadata _applicationMetadata;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public InstanceDataUnitOfWorkInitializer(
        IDataClientWithStorageMetadata dataClient,
        IInstanceMutationClient mutationClient,
        IInstanceClientWithStorageMetadata instanceClient,
        IAppMetadata applicationMetadata,
        ITranslationService translationService,
        ModelSerializationService modelSerializationService,
        IAppResources appResources,
        IOptions<FrontEndSettings> frontEndSettings,
        Telemetry? telemetry = null
    )
    {
        _dataClient = dataClient;
        _mutationClient = mutationClient;
        _instanceClient = instanceClient;
        _translationService = translationService;
        _modelSerializationService = modelSerializationService;
        _appResources = appResources;
        _frontEndSettings = frontEndSettings;
        _telemetry = telemetry;
        _applicationMetadata = applicationMetadata;
    }

    /// <summary>
    /// Initializes an <see cref="InstanceDataUnitOfWork"/> with all the services it needs.
    /// This is marked as internal so that this class can only be used internally. Even if it is public for usage (as a DI service) in public classes.
    /// </summary>
    internal Task<InstanceDataUnitOfWork> Init(
        Instance instance,
        StorageVersionMetadata versions,
        string? taskId,
        string? language,
        StorageAuthenticationMethod? authenticationMethodForAllDataTypes = null
    ) =>
        Init(
            instance,
            versions,
            taskId,
            language,
            authenticationMethodForAllDataTypes,
            readsCapturedBlobVersions: false
        );

    /// <summary>
    /// Initializes the <see cref="InstanceDataUnitOfWork"/> of a workflow callback from the instance that its callback
    /// state carries. It reads and writes as the service owner, and reads a binary element by the blob version the
    /// instance lists for it. A step that runs again after its save was committed then reads what its first attempt
    /// read, also when that attempt deleted or replaced the element.
    /// </summary>
    internal Task<InstanceDataUnitOfWork> InitForWorkflowCallback(
        Instance instance,
        StorageVersionMetadata versions,
        string? taskId,
        string? language
    ) =>
        Init(
            instance,
            versions,
            taskId,
            language,
            StorageAuthenticationMethod.ServiceOwner(),
            readsCapturedBlobVersions: true
        );

    private async Task<InstanceDataUnitOfWork> Init(
        Instance instance,
        StorageVersionMetadata versions,
        string? taskId,
        string? language,
        StorageAuthenticationMethod? authenticationMethodForAllDataTypes,
        bool readsCapturedBlobVersions
    )
    {
        var applicationMetadata = _applicationMetadata.ApplicationMetadata;
        var uow = new InstanceDataUnitOfWork(
            instance,
            versions,
            _dataClient,
            _mutationClient,
            _instanceClient,
            applicationMetadata,
            _translationService,
            _modelSerializationService,
            _appResources,
            _frontEndSettings,
            taskId,
            language,
            _telemetry,
            readsCapturedBlobVersions
        );

        if (authenticationMethodForAllDataTypes is not null)
        {
            uow.UseAuthenticationForAllDataTypes(authenticationMethodForAllDataTypes);
        }

        return uow;
    }
}
