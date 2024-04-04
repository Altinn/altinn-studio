using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ORMDeploymentRepository : IDeploymentRepository
{
    public Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity) => throw new System.NotImplementedException();

    public Task<IEnumerable<DeploymentEntity>> Get(string org, string app, DocumentQueryModel query) => throw new System.NotImplementedException();

    public Task<DeploymentEntity> Get(string org, string buildId) => throw new System.NotImplementedException();

    public Task Update(DeploymentEntity deploymentEntity) => throw new System.NotImplementedException();
}
