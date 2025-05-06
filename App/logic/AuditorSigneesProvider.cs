#nullable enable
using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Signing;
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

        var organisationSignee = new ProvidedOrganization
        {
            Name = revisor.Navn,
            OrganizationNumber = revisor.Organisasjonsnummer,
            CommunicationConfig = new CommunicationConfig
            {
                InboxMessage = new InboxMessage
                {
                    TitleTextResourceKey = "signing.correspondence_title_common",
                    SummaryTextResourceKey = "signing.correspondence_summary_revisor",
                    BodyTextResourceKey = "signing.correspondence_body_revisor"
                },
                Notification = new Notification
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
