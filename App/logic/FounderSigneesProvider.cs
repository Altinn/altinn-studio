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

public class FounderSigneesProvider : ISigneeProvider
{
    private readonly IDataClient _dataClient;

    public FounderSigneesProvider(IDataClient dataClient)
    {
        _dataClient = dataClient;
    }

    public string Id { get; init; } = "founders";

    public async Task<SigneesResult> GetSigneesAsync(Instance instance)
    {
        Skjemadata formData = await GetFormData(instance);

        List<ProvidedSignee> signeeParties = [];
        foreach (StifterPerson stifterPerson in formData.StifterPerson)
        {
            var personSignee = new PersonSignee
            {
                FullName = string.Join(
                    " ",
                    [stifterPerson.Fornavn, stifterPerson.Mellomnavn, stifterPerson.Etternavn]
                ),
                SocialSecurityNumber = stifterPerson.Foedselsnummer?.ToString() ?? string.Empty,
                Notifications = new Notifications
                {
                    OnSignatureAccessRightsDelegated = new Notification
                    {
                        Email = new Email
                        {
                            EmailAddress = stifterPerson.Epost,
                            SubjectTextResourceKey = "signing.email_subject",
                            BodyTextResourceKey = "signing.notification_content".Replace(
                                "{0}",
                                stifterPerson.Fornavn
                            ),
                        },
                        Sms = new Sms
                        {
                            MobileNumber = stifterPerson.Mobiltelefon,
                            BodyTextResourceKey = "signing.notification_content".Replace(
                                "{0}",
                                stifterPerson.Fornavn
                            ),
                        }
                    }
                }
            };

            signeeParties.Add(personSignee);
        }

        foreach (StifterVirksomhet stifterVirksomhet in formData.StifterVirksomhet)
        {
            var organisationSignee = new OrganisationSignee
            {
                Name = stifterVirksomhet.Navn,
                OrganisationNumber =
                    stifterVirksomhet.Organisasjonsnummer?.ToString() ?? string.Empty,
                Notifications = new Notifications
                {
                    OnSignatureAccessRightsDelegated = new Notification
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

            signeeParties.Add(organisationSignee);
        }

        return new SigneesResult { Signees = signeeParties };
    }

    private async Task<Skjemadata> GetFormData(Instance instance)
    {
        DataElement modelData = instance.Data.Single(x => x.DataType == "Skjemadata");
        InstanceIdentifier instanceIdentifier = new(instance);

        return (Skjemadata)
            await _dataClient.GetFormData(
                instanceIdentifier.InstanceGuid,
                typeof(Skjemadata),
                instance.Org,
                instance.AppId,
                instanceIdentifier.InstanceOwnerPartyId,
                new Guid(modelData.Id)
            );
    }
}
