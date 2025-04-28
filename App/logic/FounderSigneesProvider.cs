#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Models.Skjemadata;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class FounderSigneesProvider(IDataClient dataClient) : ISigneeProvider
{
    public string Id { get; init; } = "founders";

    public async Task<SigneeProviderResult> GetSigneesAsync(Instance instance)
    {
        Skjemadata formData = await GetFormData(instance);

        List<ProvidedSignee> providedSignees = [];
        foreach (StifterPerson stifterPerson in formData.StifterPerson)
        {
            var personSignee = new ProvidedPerson
            {
                FullName = string.Join(
                    " ",
                    [stifterPerson.Fornavn, stifterPerson.Mellomnavn, stifterPerson.Etternavn]
                ),
                SocialSecurityNumber = stifterPerson.Foedselsnummer?.ToString() ?? string.Empty,
                ContactDetails = new ContactDetails
                {
                    InboxMessage = new InboxMessage
                    {
                        TitleTextResourceKey = "signing.correspondence_title_common",
                        SummaryTextResourceKey = "signing.correspondence_summary_stifter_person",
                        BodyTextResourceKey = "signing.correspondence_body_stifter_person"
                    },
                    Notification = new Notification
                    {
                        Email = new Email
                        {
                            EmailAddress = stifterPerson.Epost,
                            SubjectTextResourceKey = "signing.email_subject",
                            BodyTextResourceKey = "signing.notification_content"
                        },
                        Sms = new Sms
                        {
                            MobileNumber = stifterPerson.Mobiltelefon,
                            BodyTextResourceKey = "signing.notification_content"
                        }
                    }
                },
            };

            providedSignees.Add(personSignee);
        }

        foreach (StifterVirksomhet stifterVirksomhet in formData.StifterVirksomhet)
        {
            var organisationSignee = new ProvidedOrganization
            {
                Name = stifterVirksomhet.Navn,
                OrganizationNumber =
                    stifterVirksomhet.Organisasjonsnummer?.ToString() ?? string.Empty,
                ContactDetails = new ContactDetails
                {
                    InboxMessage = new InboxMessage
                    {
                        TitleTextResourceKey = "signing.correspondence_title_common",
                        SummaryTextResourceKey = "signing.correspondence_summary_stifter_organisasjon",
                        BodyTextResourceKey = "signing.correspondence_body_stifter_organisasjon"
                    },
                    Notification = new Notification
                    {
                        Email = new Email
                        {
                            EmailAddress = stifterVirksomhet.Epost,
                            SubjectTextResourceKey = "signing.email_subject",
                            BodyTextResourceKey = "signing.notification_content".Replace(
                                "{0}",
                                stifterVirksomhet.Navn
                            ),
                        },
                        Sms = new Sms
                        {
                            MobileNumber = stifterVirksomhet.Mobiltelefon,
                            BodyTextResourceKey = "signing.notification_content".Replace(
                                "{0}",
                                stifterVirksomhet.Navn
                            ),
                        }
                    }
                }
            };

            providedSignees.Add(organisationSignee);
        }

        return new SigneeProviderResult { Signees = providedSignees };
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
