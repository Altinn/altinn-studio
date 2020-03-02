using Altinn.Platform.Profile.Models;

namespace Altinn.Platform.Receipt.Test.Testdata
{
    public static class UserProfiles
    {

        public static UserProfile User1 = new UserProfile
        {
            UserId = 1,
            Email = "test@test.no",
            PartyId = Parties.Party1.PartyId,
            PhoneNumber = "98765432",
            UserType = Altinn.Platform.Profile.Enums.UserType.SelfIdentified,
            Party = Parties.Party1
        };
    }
}
