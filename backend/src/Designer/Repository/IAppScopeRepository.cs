using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppScope;

namespace Altinn.Studio.Designer.Repository;

public interface IAppScopeRepository
{
    Task<AppScopeEntity> GetAppScopeAsync(string org, string app);
}
