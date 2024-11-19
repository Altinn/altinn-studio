#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Signing.Interfaces;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Models.Skjemadata;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class AuditorSigneesProvider : ISigneeProvider
{
    private readonly IDataClient _dataClient;

    public AuditorSigneesProvider(IDataClient dataClient)
    {
        _dataClient = dataClient;
    }
    
    public string Id { get; init; } = "auditor";
    
    public async Task<SigneesResult> GetSigneesAsync(Instance instance)
    {
        Skjemadata formData = await GetFormData(instance);
        Revisor revisor = formData.Revisor;
        
        var organisationSignee = new OrganisationSignee
        {
            DisplayName = revisor.Navn,
            OrganisationNumber = revisor.Organisasjonsnummer?.ToString() ?? string.Empty,
            Notifications = new Notifications
            {
                OnSignatureAccessRightsDelegated = new Notification
                {
                    Email = new Email
                    {
                        Subject = "Revisjonsoppdrag mottatt for signering i Altinn",
                        Body = "Nytt revisjonsoppdrag for " + revisor.Navn + " er mottatt for signering i Altinn. Logg inn på Altinn for å signere.\n\nMed vennlig hilsen\nBrønnøysundregistrene"
                    }
                }
            }
        };
            
        return new SigneesResult
        {
            PersonSignees = [],
            OrganisationSignees = [organisationSignee]
        };
    }
    
    private async Task<Skjemadata> GetFormData(Instance instance)
    {
        DataElement modelData = instance.Data.Single(x => x.DataType == "model");
        InstanceIdentifier instanceIdentifier = new(instance);

        return (Skjemadata)await _dataClient.GetFormData(instanceIdentifier.InstanceGuid, typeof(Skjemadata), instance.Org,
            instance.AppId,
            instanceIdentifier.InstanceOwnerPartyId, new Guid(modelData.Id));
    }
}