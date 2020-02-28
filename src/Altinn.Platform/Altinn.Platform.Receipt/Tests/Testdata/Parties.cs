using Altinn.Platform.Register.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace Tests.Testdata
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
