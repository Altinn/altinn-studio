#nullable enable
using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Signing.Interfaces;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Models.Skjemadata;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class AuditorSigneesProvider(IDataClient dataClient) : ISigneeProvider
{
    public string Id { get; init; } = "auditor";

    public async Task<SigneeProviderResult> GetSigneesAsync(Instance instance)
    {
        Skjemadata formData = await GetFormData(instance);
        Revisor revisor = formData.Revisor;

        if (formData.Revisor.HarRevisor == "nei")
        {
            return new SigneeProviderResult { Signees = [] };
        }

        var organisationSignee = new ProvidedSignee.Organization
        {
            Name = revisor.Navn,
            OrganizationNumber = revisor.Organisasjonsnummer,
            Notifications = new Notifications
            {
                OnSignatureAccessRightsDelegated = new Notification
                {
                    Email = new Email
                    {
                        EmailAddress = revisor.Epost,
                        SubjectTextResourceKey = "signing.revisor_email_subject",
                        BodyTextResourceKey = "signing.revisor_notification_content"
                    }
                }
            }
        };

        return new SigneeProviderResult { Signees = [organisationSignee] };
    }

    private async Task<Skjemadata> GetFormData(Instance instance)
    {
        DataElement modelData = instance.Data.Single(x => x.DataType == "Skjemadata");
        InstanceIdentifier instanceIdentifier = new(instance);

        return (Skjemadata)
            await dataClient.GetFormData(
                instanceIdentifier.InstanceGuid,
                typeof(Skjemadata),
                instance.Org,
                instance.AppId,
                instanceIdentifier.InstanceOwnerPartyId,
                new Guid(modelData.Id)
            );
    }
}
