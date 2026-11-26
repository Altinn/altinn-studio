using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment;

/// <summary>
/// The payment information stored on an instance, with the data element that holds it.
/// </summary>
internal sealed class StoredPaymentInformation
{
    private const string JsonContentType = "application/json";
    private const string AttemptStepProperty = "attemptStep";

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    private byte[] _storedContent;

    private readonly StoredAttemptStep? _attemptStep;

    private StoredPaymentInformation(
        DataElement dataElement,
        PaymentInformation paymentInformation,
        StoredAttemptStep? attemptStep,
        byte[] storedContent
    )
    {
        DataElement = dataElement;
        PaymentInformation = paymentInformation;
        _attemptStep = attemptStep;
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
    /// How the step <paramref name="stepId"/> ended, when it is the step of a payment attempt that stored the record
    /// last. The step is stored beside the payment information, so <see cref="PaymentInformation"/> read from the record
    /// never shows it.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// The record names the step with an ending this version does not know; the step must not decide again.
    /// </exception>
    public PaymentAttemptEnding? EndingStoredBy(Guid stepId)
    {
        if (_attemptStep?.StepId != stepId)
        {
            return null;
        }

        return Enum.TryParse(_attemptStep.Ending, out PaymentAttemptEnding ending)
            ? ending
            : throw new InvalidOperationException(
                $"The payment record names step {stepId} with the ending '{_attemptStep.Ending}', which this version does not know."
            );
    }

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
        StoredAttemptStep? attemptStep = JsonSerializer
            .Deserialize<AttemptStepHolder>(paymentData.Span, _jsonSerializerOptions)
            ?.AttemptStep;

        return new StoredPaymentInformation(
            paymentDataElement,
            paymentInformation,
            attemptStep,
            JsonSerializer.SerializeToUtf8Bytes(paymentInformation, _jsonSerializerOptions)
        );
    }

    /// <summary>
    /// Stages <paramref name="paymentInformation"/> as the instance's payment record, stored by
    /// <paramref name="attemptStep"/>: over <paramref name="existing"/>, or as a new data element when there is none.
    /// </summary>
    public static void Store(
        IInstanceDataMutator dataMutator,
        string paymentDataType,
        StoredPaymentInformation? existing,
        PaymentInformation paymentInformation,
        PaymentAttemptStep attemptStep
    )
    {
        byte[] content = Serialize(paymentInformation, attemptStep);
        if (existing is null)
        {
            dataMutator.AddBinaryDataElement(paymentDataType, JsonContentType, $"{paymentDataType}.json", content);
        }
        else
        {
            dataMutator.UpdateBinaryDataElement(existing.DataElement, JsonContentType, content);
        }
    }

    /// <summary>
    /// Stages <see cref="PaymentInformation"/> as the new content of the data element, stored by
    /// <paramref name="attemptStep"/>. Always a change, since no two steps share an id.
    /// </summary>
    public void Store(IInstanceDataMutator dataMutator, PaymentAttemptStep attemptStep)
    {
        dataMutator.UpdateBinaryDataElement(DataElement, JsonContentType, Serialize(PaymentInformation, attemptStep));
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

    private static byte[] Serialize(PaymentInformation paymentInformation, PaymentAttemptStep attemptStep)
    {
        JsonObject record =
            JsonSerializer.SerializeToNode(paymentInformation, _jsonSerializerOptions)?.AsObject()
            ?? throw new InvalidOperationException("Payment information serialized to null.");
        record[AttemptStepProperty] = JsonSerializer.SerializeToNode(attemptStep, _jsonSerializerOptions);
        return JsonSerializer.SerializeToUtf8Bytes(record, _jsonSerializerOptions);
    }

    private sealed record AttemptStepHolder(
        [property: JsonPropertyName(AttemptStepProperty)] StoredAttemptStep? AttemptStep
    );

    // The ending is read as a name, so that a record whose ending this version does not know stays readable for
    // everything but a run of the step it names.
    private sealed record StoredAttemptStep(Guid StepId, string? Ending);
}

/// <summary>
/// A step of a payment attempt, by the engine's step id, and how it ended. A run of the same step that follows it
/// returns this ending instead of deciding again.
/// </summary>
internal sealed record PaymentAttemptStep(
    Guid StepId,
    [property: JsonConverter(typeof(JsonStringEnumConverter<PaymentAttemptEnding>))] PaymentAttemptEnding Ending
);
