using Altinn.App.Core.Models;

namespace Altinn.App.Tests.Common;

public static class IdentificationNumberProvider
{
    public static class OrganizationNumbers
    {
        public static OrganizationNumber GetValidNumber(int index)
        {
            var i = index % ValidOrganizationNumbers.Length;
            return OrganizationNumber.Parse(ValidOrganizationNumbers[i]);
        }

        public static OrganizationNumber GetInvalidNumber(int index)
        {
            var i = index % InvalidOrganizationNumbers.Length;
            return OrganizationNumber.Parse(InvalidOrganizationNumbers[i]);
        }

        internal static readonly string[] ValidOrganizationNumbers =
        [
            "474103390",
            "593422461",
            "331660698",
            "904162426",
            "316620612",
            "452496593",
            "591955012",
            "343679238",
            "874408522",
            "857498941",
            "084209694",
            "545482657",
            "713789208",
            "149618953",
            "014888918",
            "184961733",
            "825076719",
            "544332597",
            "579390867",
            "930771813",
            "207154156",
            "601050765",
            "085483285",
            "004430301",
        ];

        internal static readonly string[] InvalidOrganizationNumbers =
        [
            "474103392",
            "593422460",
            "331661698",
            "904172426",
            "316628612",
            "452496592",
            "591956012",
            "343679338",
            "874408520",
            "857498949",
            "084239694",
            "545487657",
            "623752180",
            "177442146",
            "262417258",
            "897200890",
            "509527177",
            "956866735",
            "760562895",
            "516103886",
            "192411646",
            "486551298",
            "370221387",
            "569288067",
            "322550165",
            "773771810",
            "862984904",
            "548575390",
            "183139014",
            "181318036",
            "843828242",
            "668910901",
            "123456789",
            "987654321",
            "12345",
            "08548328f",
        ];
    }

    public static class NationalIdentityNumbers
    {
        public static NationalIdentityNumber GetValidNumber(int index)
        {
            var i = index % ValidNationalIdentityNumbers.Length;
            return NationalIdentityNumber.Parse(ValidNationalIdentityNumbers[i]);
        }

        public static NationalIdentityNumber GetInvalidNumber(int index)
        {
            var i = index % InvalidNationalIdentityNumbers.Length;
            return NationalIdentityNumber.Parse(InvalidNationalIdentityNumbers[i]);
        }

        internal static readonly string[] ValidNationalIdentityNumbers =
        [
            "13896396174",
            "29896695590",
            "21882448425",
            "03917396654",
            "61875300317",
            "60896400498",
            "65918300265",
            "22869798367",
            "02912447718",
            "22909397689",
            "26267892619",
            "12318496828",
            "20270310266",
            "10084808933",
            "09113920472",
            "28044017069",
            "18055606346",
            "24063324295",
            "16084521195",
        ];

        internal static readonly string[] InvalidNationalIdentityNumbers =
        [
            "13816396174",
            "29896795590",
            "21883418425",
            "03917506654",
            "61175310317",
            "60996410498",
            "65918310265",
            "22869898467",
            "02912447719",
            "22909397680",
            "26270892619",
            "12318696828",
            "20289310266",
            "11084808933",
            "08113921472",
            "28044417069",
            "180556f6346",
            "240633242951",
            "1234",
        ];
    }
}
