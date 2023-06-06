using System.Collections.Generic;
using System.Threading.Tasks;
using PolicyAdmin.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization
{
    public interface IPolicyOptions
    {
        public Task<List<ActionOption>> GetActionOptions();

        public Task<List<SubjectOption>> GetSubjectOptions();
    }
}
