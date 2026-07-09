using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Texts;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Service for initializing an <see cref="InstanceDataUnitOfWork"/> with all the services it needs.
/// </summary>
internal class InstanceDataUnitOfWorkInitializer
{
    private readonly IStorageDataClient _dataClient;
    private readonly IStorageInstanceClient _instanceClient;
    private readonly ITranslationService _translationService;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly IAppResources _appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings;
    private readonly Telemetry? _telemetry;
    private readonly IAppMetadata _applicationMetadata;
    private readonly IInstanceDataMutatorStorageAccessGuard _storageAccessGuard;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public InstanceDataUnitOfWorkInitializer(
        IStorageDataClient dataClient,
        IStorageInstanceClient instanceClient,
        IAppMetadata applicationMetadata,
        ITranslationService translationService,
        ModelSerializationService modelSerializationService,
        IAppResources appResources,
        IOptions<FrontEndSettings> frontEndSettings,
        IInstanceDataMutatorStorageAccessGuard storageAccessGuard,
        Telemetry? telemetry = null
    )
    {
        _dataClient = dataClient;
        _instanceClient = instanceClient;
        _translationService = translationService;
        _modelSerializationService = modelSerializationService;
        _appResources = appResources;
        _frontEndSettings = frontEndSettings;
        _telemetry = telemetry;
        _applicationMetadata = applicationMetadata;
        _storageAccessGuard = storageAccessGuard;
    }

    /// <summary>
    /// Initializes an <see cref="InstanceDataUnitOfWork"/> with all the services it needs.
    /// The returned unit of work is inactive: direct public Storage access is not blocked in the current async
    /// execution context until <see cref="InstanceDataUnitOfWork.Open"/> is called.
    /// This is marked as internal so that this class can only be used internally. Even if it is public for usage (as a DI service) in public classes.
    /// </summary>
    internal async Task<InstanceDataUnitOfWork> Init(
        Instance instance,
        string? taskId,
        string? language,
        StorageAuthenticationMethod? authenticationMethodForAllDataTypes = null
    )
    {
        var applicationMetadata = await _applicationMetadata.GetApplicationMetadata();
        var uow = new InstanceDataUnitOfWork(
            instance,
            _dataClient,
            _instanceClient,
            applicationMetadata,
            _translationService,
            _modelSerializationService,
            _appResources,
            _frontEndSettings,
            _storageAccessGuard,
            taskId,
            language,
            _telemetry
        );

        if (authenticationMethodForAllDataTypes is not null)
        {
            uow.UseAuthenticationForAllDataTypes(authenticationMethodForAllDataTypes);
        }

        return uow;
    }

    /// <summary>
    /// Opens an <see cref="InstanceDataUnitOfWork"/> for the current async execution context.
    /// </summary>
    /// <remarks>
    /// The direct Storage access guard is activated synchronously when this method is called, before async
    /// initialization starts. The activation is visible through the current .NET
    /// <see cref="System.Threading.ExecutionContext"/>, where <see cref="AsyncLocal{T}"/> state flows through async
    /// continuations, and is not tied to C# lexical scope. Callers must call this method in the execution context they
    /// want guarded. The returned unit of work owns the activation until
    /// <see cref="InstanceDataUnitOfWork.Dispose"/>.
    /// </remarks>
    internal Task<InstanceDataUnitOfWork> Open(
        Instance instance,
        string? taskId,
        string? language,
        StorageAuthenticationMethod? authenticationMethodForAllDataTypes = null
    )
    {
        IDisposable scope = _storageAccessGuard.EnterScope();
        return InitAndTransferStorageAccessGuardScope(
            instance,
            taskId,
            language,
            authenticationMethodForAllDataTypes,
            scope
        );
    }

    private async Task<InstanceDataUnitOfWork> InitAndTransferStorageAccessGuardScope(
        Instance instance,
        string? taskId,
        string? language,
        StorageAuthenticationMethod? authenticationMethodForAllDataTypes,
        IDisposable scope
    )
    {
        try
        {
            InstanceDataUnitOfWork unitOfWork = await Init(
                instance,
                taskId,
                language,
                authenticationMethodForAllDataTypes
            );
            unitOfWork.TakeOwnershipOfCurrentExecutionContextActivation(scope);
            return unitOfWork;
        }
        catch
        {
            scope.Dispose();
            throw;
        }
    }
}
