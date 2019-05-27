using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Authentication.Enum
{
    /// <summary>
    /// This holds information about different types of authentication methods available in Altinn.
    /// </summary>
    public enum AuthenticationMethod
    {
        /// <summary>
        /// The authentication method is not defined
        /// </summary>
        NotDefined = -1, 

        /// <summary>
        /// User is logged in with AltinnPin
        /// </summary>
        AltinnPIN = 0, 

        /// <summary>
        /// User is logged in with BankID
        /// </summary>
        BankID = 1, 

        /// <summary>
        /// User is logged in with help of BuyPass
        /// </summary>
        BuyPass = 2, 

        /// <summary>
        /// User is logged in with help of SAML
        /// </summary>
        SAML2 = 3, 

        /// <summary>
        /// User is logged in with help of SMS pin
        /// </summary>
        SMSPIN = 4, 

        /// <summary>
        /// User is logged in with help of static password
        /// </summary>
        StaticPassword = 5, 

        /// <summary>
        /// User is logged in with help of TaxPIN
        /// </summary>
        TaxPIN = 6,

        /// <summary>
        /// This value was used until March 2017 for MinIDOTC, BankIDMobil and EIDAS
        /// </summary>
        FederationNotUsedAnymore = 7, 

        /// <summary>
        /// User is logged in with help of Self Identified
        /// </summary>
        SelfIdentified = 8, 

        /// <summary>
        /// User is logged in with help of Enterprise Identified
        /// </summary>
        EnterpriseIdentified = 9, 

        /// <summary>
        /// User is logged in with Commfides
        /// </summary>
        Commfides = 10, 

        /// <summary>
        /// User is logged in with MinID PIN
        /// </summary>
        MinIDPin = 11,

        /// <summary>
        /// User is logged in with SFTP
        /// </summary>
        OpenSshIdentified = 12, 

        /// <summary>
        /// User is logged in with eIDAS
        /// </summary>
        EIDAS = 13,

        /// <summary>
        /// User is logged in with BankID mobil
        /// </summary>
        BankIDMobil = 14,

        /// <summary>
        /// User is logged in with help of IDPORTEN OTC
        /// </summary>
        MinIDOTC = 15
    }
}
