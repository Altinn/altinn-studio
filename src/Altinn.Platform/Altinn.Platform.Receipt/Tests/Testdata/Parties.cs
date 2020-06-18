using Altinn.Platform.Register.Models;

namespace Altinn.Platform.Receipt.Tests.Testdata
{
   public static class Parties
    {
        public static Party Party1 = new Party
        {
            PartyId = 50001,
            SSN = "12345678901",
            PartyTypeName = Register.Enums.PartyType.Person
        };
    }
}
