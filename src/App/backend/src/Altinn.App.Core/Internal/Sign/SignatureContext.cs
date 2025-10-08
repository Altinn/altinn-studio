using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Sign;

/// <summary>
/// Context for a signature of DataElements
/// </summary>
public class SignatureContext
{
    /// <summary>
    /// Create a new signing context for one data element
    /// </summary>
    /// <param name="instanceIdentifier">Identifier for the instance containing the data elements to sign</param>
    /// <param name="generatedFromTask">The id of the task connected to this signature</param>
    /// <param name="signeeStatesDataTypeId">The id of the DataType where the signature should be stored</param>
    /// <param name="signee">The signee</param>
    /// <param name="dataElementSignature">The data element to sign <see cref="DataElementSignature"/></param>
    public SignatureContext(
        InstanceIdentifier instanceIdentifier,
        string generatedFromTask,
        string signeeStatesDataTypeId,
        Signee signee,
        params DataElementSignature[] dataElementSignature
    )
    {
        InstanceIdentifier = instanceIdentifier;
        GeneratedFromTask = generatedFromTask;
        SigneeStatesDataTypeId = signeeStatesDataTypeId;
        DataElementSignatures.AddRange(dataElementSignature);
        Signee = signee;
    }

    /// <summary>
    /// Create a new signing context for multiple data elements
    /// </summary>
    /// <param name="instanceIdentifier">Identifier for the instance containing the data elements to sign</param>
    /// <param name="generatedFromTask">The id of the task connected to this signature</param>
    /// <param name="signeeStatesDataTypeId">The id of the DataType where the signature should be stored</param>
    /// <param name="signee">The signee</param>
    /// <param name="dataElementSignatures">The data elements to sign <see cref="DataElementSignature"/></param>
    public SignatureContext(
        InstanceIdentifier instanceIdentifier,
        string generatedFromTask,
        string signeeStatesDataTypeId,
        Signee signee,
        List<DataElementSignature> dataElementSignatures
    )
    {
        InstanceIdentifier = instanceIdentifier;
        GeneratedFromTask = generatedFromTask;
        SigneeStatesDataTypeId = signeeStatesDataTypeId;
        DataElementSignatures = dataElementSignatures;
        Signee = signee;
    }

    /// <summary>
    /// The id of the DataType where the signature should be stored
    /// </summary>
    public string SigneeStatesDataTypeId { get; }

    /// <summary>
    /// Identifier for the instance containing the data elements to sign
    /// </summary>
    public InstanceIdentifier InstanceIdentifier { get; }

    /// <summary>
    /// List of DataElements and whether they are signed or not <see cref="DataElementSignature"/>
    /// </summary>
    public List<DataElementSignature> DataElementSignatures { get; } = new();

    /// <summary>
    /// The user performing the signing <see cref="Signee"/>
    /// </summary>
    public Signee Signee { get; }

    /// <summary>
    /// The task which should be linked to this signature
    /// </summary>
    public string GeneratedFromTask { get; }
}

/// <summary>
/// Object representing the user performing the signing
/// </summary>
public class Signee
{
    /// <summary>
    /// User id of the user performing the signing
    /// </summary>
#nullable disable
    public string UserId { get; set; }

#nullable restore

    /// <summary>
    /// The system user id of the user performing the signing
    /// </summary>
    public Guid? SystemUserId { get; set; }

    /// <summary>
    /// The SSN of the user performing the signing, set if the signer is a person
    /// </summary>
    public string? PersonNumber { get; set; }

    /// <summary>
    /// The organisation number of the user performing the signing, set if the signer is an organisation
    /// </summary>
    public string? OrganisationNumber { get; set; }
}

/// <summary>
/// Object representing a data element and whether it is signed or not
/// </summary>
public class DataElementSignature
{
    /// <summary>
    /// Create a new data element where the signed status is set to true
    /// </summary>
    /// <param name="dataElementId">ID of the DataElement that should be included in the signature</param>
    public DataElementSignature(string dataElementId)
    {
        DataElementId = dataElementId;
        Signed = true;
    }

    /// <summary>
    /// Create a new data element where the signed status is set to the value of the signed parameter
    /// </summary>
    /// <param name="dataElementId">ID of the DataElement that should be included in the signature</param>
    /// <param name="signed">Whether the DataElement is signed or not</param>
    public DataElementSignature(string dataElementId, bool signed)
    {
        DataElementId = dataElementId;
        Signed = signed;
    }

    /// <summary>
    /// ID of the DataElement that should be included in the signature
    /// </summary>
    public string DataElementId { get; }

    /// <summary>
    /// Whether the DataElement is signed or not
    /// </summary>
    public bool Signed { get; }
}
