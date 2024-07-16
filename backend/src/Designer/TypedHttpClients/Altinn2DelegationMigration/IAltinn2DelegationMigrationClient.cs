using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2DelegationMigration
{
    public interface IAltinn2DelegationMigrationClient
    {
        Task<DelegationCountOverview> GetNumberOfDelegations(string serviceCode, int serviceEditionCode, string environment);
    }
}
