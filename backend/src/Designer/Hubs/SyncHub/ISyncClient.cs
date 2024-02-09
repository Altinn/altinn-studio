using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Hubs.SyncHub;

public interface ISyncClient

{
    Task FileSyncError(SyncError syncError);
}
