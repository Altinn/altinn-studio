#nullable enable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using MediatR;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class DeploymentPollingRecoveryJob(IDeploymentRepository deploymentRepository, IPublisher publisher) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        var deployments = await deploymentRepository.GetDeploymentsNeedingPollingRecovery(
            DeploymentPollingRecoveryJobConstants.BatchSize,
            context.CancellationToken
        );

        foreach (var deployment in deployments)
        {
            await publisher.Publish(
                new DeploymentPipelineQueued
                {
                    EditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                        deployment.Org,
                        deployment.App,
                        deployment.CreatedBy
                    ),
                    WorkflowId = deployment.Build.Id,
                    ExternalBuildId = int.Parse(deployment.Build.ExternalId),
                    PipelineType =
                        deployment.DeploymentType == DeploymentType.Deploy
                            ? PipelineType.Deploy
                            : PipelineType.Undeploy,
                    Environment = deployment.EnvName,
                },
                context.CancellationToken
            );
        }
    }
}
