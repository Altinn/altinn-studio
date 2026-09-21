#nullable enable
using System;
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

        // The auditor block is absent until the user answers the "har revisor" question, so no
        // auditor data — like an explicit "nei" — simply means there is no auditor to sign.
        if (formData.Revisor is not { } revisor || revisor.HarRevisor == "nei")
        {
            return new SigneeProviderResult { Signees = [] };
        }

        // Navn and Organisasjonsnummer are filled in together by the OrganizationLookup component
        // and are required by the model schema once the auditor block applies, so a missing value
        // here means the app is misconfigured.
        string name =
            revisor.Navn
            ?? throw new InvalidOperationException(
                "Expected Revisor.Navn to be set when the auditor block applies"
            );
        string organizationNumber =
            revisor.Organisasjonsnummer
            ?? throw new InvalidOperationException(
                "Expected Revisor.Organisasjonsnummer to be set when the auditor block applies"
            );

        var organisationSignee = new ProvidedOrganization
        {
            Name = name,
            OrganizationNumber = organizationNumber,
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
