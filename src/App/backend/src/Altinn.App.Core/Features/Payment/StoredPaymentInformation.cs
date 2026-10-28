using System.Text.Json;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment;

/// <summary>
/// The payment information stored on an instance, with the data element that holds it.
/// </summary>
internal sealed class StoredPaymentInformation
{
    private const string JsonContentType = "application/json";

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private byte[] _storedContent;

    private StoredPaymentInformation(
        DataElement dataElement,
        PaymentInformation paymentInformation,
        byte[] storedContent
    )
    {
        DataElement = dataElement;
        PaymentInformation = paymentInformation;
        _storedContent = storedContent;
    }

    /// <summary>
    /// The data element that holds the payment information.
    /// </summary>
    public DataElement DataElement { get; }

    /// <summary>
    /// The payment information, which callers change in place before <see cref="UpdateIfChanged"/>.
    /// </summary>
    public PaymentInformation PaymentInformation { get; }

    /// <summary>
    /// Reads the stored payment information, or returns null when the instance has none.
    /// </summary>
    public static async Task<StoredPaymentInformation?> Read(IInstanceDataAccessor dataAccessor, string paymentDataType)
    {
        DataElement? paymentDataElement = dataAccessor.GetDataElementsForType(paymentDataType).SingleOrDefault();
        if (paymentDataElement is null)
        {
            return null;
        }

        ReadOnlyMemory<byte> paymentData = await dataAccessor.GetBinaryData(paymentDataElement);
        PaymentInformation paymentInformation =
            JsonSerializer.Deserialize<PaymentInformation>(paymentData.Span, _jsonSerializerOptions)
            ?? throw new InvalidOperationException("Unable to deserialize stored payment information.");

        return new StoredPaymentInformation(
            paymentDataElement,
            paymentInformation,
            JsonSerializer.SerializeToUtf8Bytes(paymentInformation, _jsonSerializerOptions)
        );
    }

    /// <summary>
    /// Stages <see cref="PaymentInformation"/> as the new content of the data element, unless it is unchanged, so that a
    /// repeated answer from the payment processor causes no write.
    /// </summary>
    /// <returns>True when a change was staged.</returns>
    public bool UpdateIfChanged(IInstanceDataMutator dataMutator)
    {
        byte[] content = JsonSerializer.SerializeToUtf8Bytes(PaymentInformation, _jsonSerializerOptions);
        if (content.AsSpan().SequenceEqual(_storedContent))
        {
            return false;
        }

        dataMutator.UpdateBinaryDataElement(DataElement, JsonContentType, content);
        _storedContent = content;
        return true;
    }
}
