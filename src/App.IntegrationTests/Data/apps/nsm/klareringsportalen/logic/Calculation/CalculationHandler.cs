using System.Threading.Tasks;
using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)
using App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.AppLogic.calculation.AppLogic.Calculation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    /// <summary>
    /// Represents a business logic class responsible for running calculations on an instance.
    /// </summary>
    public class CalculationHandler
    {
        /// <summary>
        /// Perform calculations and update data model
        /// </summary>
        /// <example>
        /// if (instance.GetType() == typeof(Skjema)
        /// {
        ///     Skjema model = (Skjema)instance;
        ///     // Perform calculations and manipulation of data model here
        /// }
        /// </example>
        /// <param name="instance">The data</param>
        public async Task<bool> Calculate(object instance)
        {
            if (instance.GetType() == typeof(ePOB_M))
            {
                ePOB_M model = (ePOB_M)instance;
                if (model.PersonInformasjon.harpostadrsammesombosted != null)
                {
                    model.PersonInformasjon.postadresse.land = model.PersonInformasjon.bostedsadresse.land;
                    model.PersonInformasjon.postadresse.adressebeskrivelse = model.PersonInformasjon.bostedsadresse.adressebeskrivelse;
                    model.PersonInformasjon.postadresse.postnummer = model.PersonInformasjon.bostedsadresse.postnummer;
                    model.PersonInformasjon.postadresse.poststed = model.PersonInformasjon.bostedsadresse.poststed;
                }

                if (model?.PersonInformasjon?.person?.naavaandestatsborgerskap?.statsborgerfrafodsel == "Ja")
                {
                    model.PersonInformasjon.person.naavaandestatsborgerskap.fraDato = model.PersonInformasjon.person.foedselsdato;
                }
                
                return true;
            }

            return await Task.FromResult(false);
        }
    }
}
