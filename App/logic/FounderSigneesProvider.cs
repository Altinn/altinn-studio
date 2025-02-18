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

        List<SigneeParty> personSignees = [];
        foreach (StifterPerson stifterPerson in formData.StifterPerson)
        {
            var personSignee = new SigneeParty
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
                            Subject = "Stiftelsesdokumenter mottatt for signering i Altinn",
                            Body =
                                "Hei "
                                + stifterPerson.Fornavn
                                + ",\n\nDu har mottatt stiftelsesdokumenter for signering i Altinn. Logg inn på Altinn for å signere dokumentene.\n\nMed vennlig hilsen\nBrønnøysundregistrene"
                        },
                        Sms = new Sms
                        {
                            MobileNumber = stifterPerson.Mobiltelefon,
                            Body =
                                "Hei "
                                + stifterPerson.Fornavn
                                + ",\n\nDu har mottatt stiftelsesdokumenter for signering i Altinn. Logg inn på Altinn for å signere dokumentene.\n\nMed vennlig hilsen\nBrønnøysundregistrene"
                        }
                    }
                }
            };

            personSignees.Add(personSignee);
        }

        List<SigneeParty> organisationSignees = [];
        foreach (StifterVirksomhet stifterVirksomhet in formData.StifterVirksomhet)
        {
            var organisationSignee = new SigneeParty
            {
                OnBehalfOfOrganisation = new SigneePartyOrganisation
                {
                    Name = stifterVirksomhet.Navn,
                    OrganisationNumber =
                        stifterVirksomhet.Organisasjonsnummer?.ToString() ?? string.Empty
                },
                Notifications = new Notifications
                {
                    OnSignatureAccessRightsDelegated = new Notification
                    {
                        Email = new Email
                        {
                            EmailAddress = stifterVirksomhet.Epost,
                            Subject = "Stiftelsesdokumenter mottatt for signering i Altinn",
                            Body =
                                "Hei "
                                + stifterVirksomhet.Navn
                                + ",\n\nNye stiftelsesdokumenter for signering i Altinn. Logg inn på Altinn for å signere dokumentene.\n\nMed vennlig hilsen\nBrønnøysundregistrene"
                        },
                        Sms = new Sms
                        {
                            MobileNumber = stifterVirksomhet.Mobiltelefon,
                            Body =
                                "Hei "
                                + stifterVirksomhet.Navn
                                + ",\n\nDu har mottatt stiftelsesdokumenter for signering i Altinn. Logg inn på Altinn for å signere dokumentene.\n\nMed vennlig hilsen\nBrønnøysundregistrene"
                        }
                    }
                }
            };

            organisationSignees.Add(organisationSignee);
        }

        return new SigneesResult { Signees = [.. personSignees, .. organisationSignees], };
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
