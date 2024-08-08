using System.Diagnostics.CodeAnalysis;

namespace Designer.Tests.Fixtures
{
    [ExcludeFromCodeCoverage]
    public static class GiteaConstants
    {
        public const string AdminUser = "adminUser";
        public const string AdminPassword = "Test1234$";
        public const string AdminEmail = "testadmin@digidir.no";

        public const string TestUser = "testUser";
        public const string TestUserPassword = "Test1234$";
        public const string TestUserEmail = "testuser@digidir.no";

        public const string TestOrgName = "Testdepartementet";
        public const string TestOrgUsername = "ttd";
        public const string TestOrgDescription = "Internt organisasjon for test av løsning";

        public const string SecondaryTestOrgName = "Testdepartementet2";
        public const string SecondaryTestOrgUsername = "ttd2";
        public const string SecondaryTestOrgDescription = "Internt organisasjon 2 for test av løsning";
    }
}
