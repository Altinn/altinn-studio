using Altinn.Notifications.Core.Enums;

namespace Altinn.Notifications.Core.Models.Address;

/// <summary>
/// A class represeting an sms address point
/// </summary>
public class SmsAddressPoint : IAddressPoint
{
    /// <inheritdoc/>
    public AddressType AddressType { get; internal set; }

    /// <summary>
    /// Gets the email address
    /// </summary>
    public string MobileNumber { get; internal set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="SmsAddressPoint"/> class.
    /// </summary>
    public SmsAddressPoint(string mobileNumber)
    {
        AddressType = AddressType.Sms;
        MobileNumber = mobileNumber;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="SmsAddressPoint"/> class.
    /// </summary>
    internal SmsAddressPoint()
    {
        MobileNumber = string.Empty;
    }
}
