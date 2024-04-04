using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ORMReleasesRepository : IReleaseRepository
{
    public Task<ReleaseEntity> Create(ReleaseEntity releaseEntity) => throw new System.NotImplementedException();

    public Task<IEnumerable<ReleaseEntity>> Get(string org, string app, DocumentQueryModel query) => throw new System.NotImplementedException();

    public Task<IEnumerable<ReleaseEntity>> Get(string org, string app, string tagName, List<string> buildStatus, List<string> buildResult) => throw new System.NotImplementedException();

    public Task<IEnumerable<ReleaseEntity>> Get(string org, string buildId) => throw new System.NotImplementedException();

    public Task<ReleaseEntity> GetSucceededReleaseFromDb(string org, string app, string tagName) => throw new System.NotImplementedException();

    public Task Update(ReleaseEntity releaseEntity) => throw new System.NotImplementedException();
}
