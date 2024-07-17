using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2DelegationMigration
{
    public interface IAltinn2DelegationMigrationClient
    {
        Task<DelegationCountOverview> GetNumberOfDelegations(string serviceCode, int serviceEditionCode, string environment);

        Task<ActionResult> StartMigrateDelegations(ExportDelegationsRequestBE delegationRequest, string environment);
    }
}
