using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using PolicyAdmin.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization
{
    public interface IPolicyOptions
    {
        public Task<List<ActionOption>> GetActionOptions(CancellationToken cancellationToken = default);

        public Task<List<SubjectOption>> GetSubjectOptions(CancellationToken cancellationToken = default);

        public Task<List<AccessPackageAreaGroup>> GetAccessPackageOptions(CancellationToken cancellationToken = default);
    }
}
