#nullable enable
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Models.Skjemadata;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class AuditorSigneesProvider : ISigneeProvider
{
    public string Id { get; init; } = "auditor";

    public async Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters)
    {
        DataElement dataElement = parameters.InstanceDataAccessor
            .GetDataElementsForType("Skjemadata")
            .Single();

        var formData = await parameters.InstanceDataAccessor.GetFormData<Skjemadata>(dataElement);
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
                },
                NotificationChoice = NotificationChoice.Email,
            },
        };

        return new SigneeProviderResult { Signees = [organisationSignee] };
    }
}
