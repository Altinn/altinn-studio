#nullable disable
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Hubs.Sync;

public interface ISyncClient

{
    Task FileSyncError(SyncError syncError);
    Task FileSyncSuccess(SyncSuccess syncSuccess);
}
