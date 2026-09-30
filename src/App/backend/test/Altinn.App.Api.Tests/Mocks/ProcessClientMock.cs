using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Mocks;

/// <summary>
/// Serves the process definition from the loaded app files and nothing else.
/// </summary>
internal sealed class ProcessClientMock(AppFilesAccessor appFiles) : IProcessClient
{
    private readonly AppFilesAccessor _appFiles = appFiles;

    public Stream GetProcessDefinition() => new MemoryAsStream(_appFiles.Current.ProcessDefinition);

    public Task<ProcessHistoryList> GetProcessHistory(
        string instanceGuid,
        string instanceOwnerPartyId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        throw new NotImplementedException();
    }
}
