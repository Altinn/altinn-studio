#nullable disable
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Hubs.EntityUpdate;

public interface IEntityUpdateClient
{
    Task EntityUpdated(EntityUpdated entityUpdated);
}
