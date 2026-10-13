using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.OrgSettings;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

public class OrgSettingsService : IOrgSettingsService
{
    private readonly IOrgSettingsRepository _repository;
    private readonly TimeProvider _timeProvider;

    public OrgSettingsService(IOrgSettingsRepository repository, TimeProvider timeProvider)
    {
        _repository = repository;
        _timeProvider = timeProvider;
    }

    public async Task<InactivityUndeploySettings> GetInactivityUndeploySettingsAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        var orgSettings = await _repository.GetAsync(org, cancellationToken);
        return InactivityUndeploySettingsResolver.ResolveOrg(orgSettings);
    }

    public async Task UpsertInactivityUndeploySettingsAsync(
        AltinnOrgEditingContext editingContext,
        InactivityUndeploySettings settings,
        CancellationToken cancellationToken = default
    )
    {
        await _repository.UpsertAsync(
            new OrgSettingsEntity
            {
                Org = editingContext.Org,
                UndeployOnInactivity = settings.UndeployOnInactivity,
                InactivityPeriodDays = settings.InactivityPeriodDays,
                Created = _timeProvider.GetUtcNow(),
                CreatedBy = editingContext.Developer,
                LastModifiedBy = editingContext.Developer,
            },
            cancellationToken
        );
    }
}
