using System;
using System.Threading.Tasks;
using Altinn.App.Models; // Uncomment this line to refer to app model(s)
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.models;
using Adresse = App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.models.Adresse;

#pragma warning disable SA1500 // Braces for multi-line statements should not share line
#pragma warning disable SA1300 // Element should begin with upper-case letter
#pragma warning disable SA1505 // Opening braces should not be followed by blank line
namespace App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.AppLogic
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    /// <summary>
    /// Represents a business logic class responsible for running logic related to instantiation.
    /// </summary>
    public class InstantiationHandler
    {
        private IProfile _profileService;
        private IRegister _registerService;

        /// <summary>
        /// Initialize a new instance of the <see cref="InstantiationHandler"/> class with services
        /// that can be used to access profile and register information.
        /// </summary>
        /// <param name="profileService">A service with access to profile information</param>
        /// <param name="registerService">A service with access to register information</param>
        public InstantiationHandler(IProfile profileService, IRegister registerService)
        {
            _profileService = profileService;
            _registerService = registerService;
        }

        /// <summary>
        /// Run validations related to instantiation
        /// </summary>
        /// <example>
        /// if ([some condition])
        /// {
        ///     return new ValidationResult("[error message]");
        /// }
        /// return null;
        /// </example>
        /// <param name="instance">The instance being validated</param>
        /// <returns>The validation result object (null if no errors) </returns>
        public async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            return await Task.FromResult((InstantiationValidationResult)null);
        }

        /// <summary>
        /// Run events related to instantiation
        /// </summary>
        /// <remarks>
        /// For example custom prefill.
        /// </remarks>
        /// <param name="instance">Instance information</param>
        /// <param name="data">The data object created</param>
        public async Task DataCreation(Instance instance, object data)
        {
            ePOB_M model = (ePOB_M)data;

            if (model.PersonInformasjon == null) {
                model.PersonInformasjon = new Personalia();
            }

            if (model.PersonInformasjon.person == null) {
              model.PersonInformasjon.person = new Person();
            }

            if (model.PersonInformasjon.postadresse == null) {
              model.PersonInformasjon.postadresse = new Adresse();
            }

            if (model.DeusRequest == null) {
              model.DeusRequest = new Deusrequest();
            }

            if (model.PersonRelasjoner == null) {
              model.PersonRelasjoner = new Relasjoner();
            }

            if (model.Samboerellerektefelle == null) {
              model.Samboerellerektefelle = new Samboerektefelle();
            }

            if (model.PersonligOkonomi == null) {
              model.PersonligOkonomi = new OEkonomi();
            }

            if (model.HelsePerson == null) {
              model.HelsePerson = new Helse();
            }

            if (model.PersonRusmidler == null) {
              model.PersonRusmidler = new Rusmidler();
            }

            if (model.Straff == null) {
              model.Straff = new Strafferettslig();
            }

            if (model.StatsTilknytning == null) {
              model.StatsTilknytning = new Statstilknytning();
            }

            if (model.SikkerhetsOpplysninger == null) {
              model.SikkerhetsOpplysninger = new Sikkerhetsopplysninger();
            }

            Altinn.Platform.Register.Models.Party party = await _registerService.GetParty(Convert.ToInt32(instance.InstanceOwner.PartyId));
            
            model.PersonInformasjon.person.personnavn.fulltnavn = party.Name;
            Addfodselsdato(model, model.PersonInformasjon.person.foedselsnummer);
            
            model.PersonInformasjon.bostedsadresse.land = "NOR";

            model.PersonInformasjon.postadresse.land = "NOR";

            model.PersonInformasjon.prefiksnr = "47";
            model.PersonInformasjon.sivilstatus = "Ugift";
            model.PersonInformasjon.hattandrepersonnummer = "Nei";
            model.PersonInformasjon.hatttidligerenavn = "Nei";
            model.PersonInformasjon.harandrestatsborgerskap = "Nei";
            model.PersonInformasjon.hatttidligerestatsborgerskap = "Nei";
            model.PersonInformasjon.ishatttidligerenavn = false;
            model.PersonRelasjoner.fodtannetlandmor = "Nei";
            model.PersonRelasjoner.fodtannetlandfar = "Nei";
            model.PersonInformasjon.harandreiddokumenter = "Nei";
            model.PersonInformasjon.hattoppholdutland = "Nei";
            model.PersonInformasjon.hattoppholdeu = "Nei";

            model.Samboerellerektefelle.hattsamboerstatsborgerandreland = "Nei";
            model.Samboerellerektefelle.hattoppholdutland = "Nei";
            model.Samboerellerektefelle.hattoppholdeos = "Nei";

            model.PersonligOkonomi.hattprivatelaan = "Nei";
            model.PersonligOkonomi.hattmislighold = "Nei";
            model.PersonligOkonomi.hattpengespill = "Nei";
            model.PersonligOkonomi.harinvesteringer = "Nei";
            model.PersonligOkonomi.harmottattpenger = "Nei";
            model.PersonligOkonomi.harsentpenger = "Nei";
            model.PersonligOkonomi.okonomiskesituasjon = "God";

            model.HelsePerson.hattsykdom = "Nei";
            model.HelsePerson.hattvurderingsevne = "Nei";
            model.HelsePerson.hattlegemidler = "Nei";

            model.PersonRusmidler.hattalkoholreaksjoner = "Nei";
            model.PersonRusmidler.hattalkoholhendelser = "Nei";
            model.PersonRusmidler.hattdoping = "Nei";
            model.PersonRusmidler.hattbruktnarkotika = "Nei";
            model.PersonRusmidler.hattbehandlingrus = "Nei";
            model.PersonRusmidler.hattakan = "Nei";

            model.Straff.hattlovbruddnorge = "Nei";
            model.Straff.hattlovbruddutland = "Nei";
            model.Straff.hattrefselse = "Nei";

            model.StatsTilknytning.hattkontaktetteretning = "Nei";
            model.StatsTilknytning.hatttjenestemilitaere = "Nei";
            model.StatsTilknytning.harstudertutland = "Nei";
            model.StatsTilknytning.hatttjenensterutland = "Nei";

            model.SikkerhetsOpplysninger.harandreforhold = "Nei";
            model.SikkerhetsOpplysninger.hattkontaktkriminalitet = "Nei";
            model.SikkerhetsOpplysninger.hattKontaktterror = "Nei";
            await Task.CompletedTask;
        }

        private void Addfodselsdato(ePOB_M model, string foedselsnummer)
        {
          if (foedselsnummer != null)
          {
            string century = "20";
            int year = int.Parse(foedselsnummer.Substring(4, 2));
            if (year >= 20 && year <= 99) {
              century = "19";
            }

            model.PersonInformasjon.person.foedselsdato = century + foedselsnummer.Substring(4, 2) + "-" + foedselsnummer.Substring(2, 2) + "-" + foedselsnummer.Substring(0, 2);
          }
        }
    }
}
#pragma warning restore SA1500 // Braces for multi-line statements should not share line
#pragma warning restore SA1505 // Opening braces should not be followed by blank line
