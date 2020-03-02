using Altinn.Platform.Register.Models;

namespace Altinn.Platform.Receipt.Test.Testdata
{
   public static class Parties
    {

        public static Party Party1 = new Party
        {
            PartyId = 50001,
            SSN = "12345678901",
            PartyTypeName = Altinn.Platform.Register.Enums.PartyType.Person
        };
    }
}
