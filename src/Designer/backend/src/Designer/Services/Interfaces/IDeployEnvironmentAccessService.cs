using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IDeployEnvironmentAccessService
{
    Task GrantAccessAsync(
        string org,
        string username,
        IEnumerable<string> environments,
        CancellationToken cancellationToken = default
    );
    Task RevokeAccessAsync(
        string org,
        string username,
        IEnumerable<string> environments,
        CancellationToken cancellationToken = default
    );
    Task<List<string>> GetDeployEnvironmentsAsync(
        string username,
        string org,
        CancellationToken cancellationToken = default
    );
    List<string> GetDeployEnvironments(
        string username,
        List<Team> deployTeams,
        Dictionary<long, List<User>> membersByTeam
    );
    Task<List<Team>> GetDeployTeamsAsync(string org, CancellationToken cancellationToken = default);
    Task<List<User>> GetTeamMembersAsync(long teamId, CancellationToken cancellationToken = default);
    Task<Dictionary<long, List<User>>> GetTeamMembersAsync(
        List<Team> deployTeams,
        CancellationToken cancellationToken = default
    );
}
