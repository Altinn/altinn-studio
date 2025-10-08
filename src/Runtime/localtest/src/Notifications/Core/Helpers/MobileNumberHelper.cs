using PhoneNumbers;

namespace Altinn.Notifications.Core.Helpers
{
    /// <summary>
    /// Helper class for all mobile number related actions
    /// </summary>
    public static class MobileNumberHelper
    {
        /// <summary>
        /// Checks if number contains country code, if not it adds the country code for Norway if number starts with 4 or 9
        /// </summary>
        /// <remarks>
        /// This method does not validate the number, only ensures that it has a country code.
        /// </remarks>
        public static string EnsureCountryCodeIfValidNumber(string mobileNumber)
        {
            if (string.IsNullOrEmpty(mobileNumber)) 
            {
                return mobileNumber;
            }
            else if (mobileNumber.StartsWith("00"))
            {
                mobileNumber = "+" + mobileNumber.Remove(0, 2);
            }
            else if (mobileNumber.Length == 8 && (mobileNumber[0] == '9' || mobileNumber[0] == '4'))
            {
                mobileNumber = "+47" + mobileNumber;
            }

            return mobileNumber;
        }

        /// <summary>
        /// Validated as mobile number based on the Altinn 2 regex
        /// </summary>
        /// <param name="mobileNumber">The string to validate as an mobile number</param>
        /// <returns>A boolean indicating that the mobile number is valid or not</returns>
        public static bool IsValidMobileNumber(string? mobileNumber)
        {
            if (string.IsNullOrEmpty(mobileNumber) || (!mobileNumber.StartsWith('+') && !mobileNumber.StartsWith("00")))
            {
                return false;
            }

            if (mobileNumber.StartsWith("00"))
            {
                mobileNumber = "+" + mobileNumber.Remove(0, 2);
            }

            PhoneNumberUtil phoneNumberUtil = PhoneNumberUtil.GetInstance();
            PhoneNumber phoneNumber = phoneNumberUtil.Parse(mobileNumber, null);
            return phoneNumberUtil.IsValidNumber(phoneNumber);
        }
    }
}
