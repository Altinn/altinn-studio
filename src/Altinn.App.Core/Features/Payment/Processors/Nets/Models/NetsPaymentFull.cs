#pragma warning disable CS1591 // Missing XML comment for publicly visible type or member
namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

internal class NetsPaymentFull
{
    public NetsPayment? Payment { get; set; }
}

internal class NetsPayment
{
    public string? PaymentId { get; set; }
    public NetsSummary? Summary { get; set; }
    public NetsConsumer? Consumer { get; set; }
    public NetsPaymentDetails? PaymentDetails { get; set; }
    public NetsOrderDetails? OrderDetails { get; set; }
    public NetsCheckoutUrls? Checkout { get; set; }
    public string? Created { get; set; }
    public NetsRefunds[]? Refunds { get; set; }
    public NetsCharges[]? Charges { get; set; }
    public string? Terminated { get; set; }
    public NetsSubscription? Subscription { get; set; }
    public NetsUnscheduledSubscription? UnscheduledSubscription { get; set; }
    public string? MyReference { get; set; }
}

internal class NetsSummary
{
    public decimal? ReservedAmount { get; set; }
    public decimal? ChargedAmount { get; set; }
    public decimal? RefundedAmount { get; set; }
    public decimal? CancelledAmount { get; set; }
}

internal class NetsConsumer
{
    public NetsAddress? ShippingAddress { get; set; }
    public NetsCompany? Company { get; set; }
    public NetsPrivatePerson? PrivatePerson { get; set; }
    public NetsAddress? BillingAddress { get; set; }
}

internal class NetsAddress
{
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? ReceiverLine { get; set; }
    public string? PostalCode { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
}

internal class NetsCompany
{
    public string? MerchantReference { get; set; }
    public string? Name { get; set; }
    public string? RegistrationNumber { get; set; }
    public NetsContactDetails? ContactDetails { get; set; }
}

internal class NetsContactDetails
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public NetsPhoneNumber? PhoneNumber { get; set; }
}

internal class NetsPhoneNumber
{
    public string? Prefix { get; set; }
    public string? Number { get; set; }
}

internal class NetsPrivatePerson
{
    public string? MerchantReference { get; set; }
    public string? DateOfBirth { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public NetsPhoneNumber? PhoneNumber { get; set; }
}

internal class NetsPaymentDetails
{
    public string? PaymentType { get; set; }
    public string? PaymentMethod { get; set; }
    public NetsInvoiceDetails? InvoiceDetails { get; set; }
    public NetsCardDetails? CardDetails { get; set; }
}

internal class NetsInvoiceDetails
{
    public string? InvoiceNumber { get; set; }
}

internal class NetsCardDetails
{
    public string? MaskedPan { get; set; }
    public string? ExpiryDate { get; set; }
}

internal class NetsOrderDetails
{
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public string? Reference { get; set; }
}

internal class NetsCheckoutUrls
{
    public string? Url { get; set; }
    public string? CancelUrl { get; set; }
}

internal class NetsRefunds
{
    public string? RefundId { get; set; }
    public decimal Amount { get; set; }
    public string? State { get; set; }
    public string? LastUpdated { get; set; }
    public NetsOrderItem[]? OrderItems { get; set; }
}

internal class NetsCharges
{
    public string? ChargeId { get; set; }
    public decimal? Amount { get; set; }
    public string? Created { get; set; }
    public NetsOrderItem[]? OrderItems { get; set; }
}

internal class NetsSubscription
{
    public string? Id { get; set; }
}

internal class NetsUnscheduledSubscription
{
    public string? UnscheduledSubscriptionId { get; set; }
}
