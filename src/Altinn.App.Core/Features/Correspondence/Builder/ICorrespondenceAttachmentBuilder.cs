using System.Net.Mime;
using Altinn.App.Core.Features.Correspondence.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Indicates that the <see cref="CorrespondenceAttachmentBuilder"/> instance is on the <see cref="CorrespondenceAttachment.Filename"/> step
/// </summary>
public interface ICorrespondenceAttachmentBuilderFilename
{
    /// <summary>
    /// Sets the filename of the attachment
    /// </summary>
    /// <param name="filename">The attachment filename</param>
    ICorrespondenceAttachmentBuilderName WithFilename(string filename);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceAttachmentBuilder"/> instance is on the <see cref="CorrespondenceAttachment.Name"/> step
/// </summary>
public interface ICorrespondenceAttachmentBuilderName
{
    /// <summary>
    /// Sets the display name of the attachment
    /// </summary>
    /// <param name="name">The display name</param>
    ICorrespondenceAttachmentBuilderSendersReference WithName(string name);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceAttachmentBuilder"/> instance is on the <see cref="CorrespondenceAttachment.SendersReference"/> step
/// </summary>
public interface ICorrespondenceAttachmentBuilderSendersReference
{
    /// <summary>
    /// Sets the senders reference for the attachment
    /// </summary>
    /// <param name="sendersReference">The reference value</param>
    ICorrespondenceAttachmentBuilderDataType WithSendersReference(string sendersReference);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceAttachmentBuilder"/> instance is on the <see cref="CorrespondenceAttachment.DataType"/> step
/// </summary>
public interface ICorrespondenceAttachmentBuilderDataType
{
    /// <summary>
    /// Sets the data type of the attachment in MIME format
    /// </summary>
    /// <remarks>See <see cref="MediaTypeNames"/></remarks>
    /// <param name="dataType">The MIME type of the attachment</param>
    ICorrespondenceAttachmentBuilderData WithDataType(string dataType);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceAttachmentBuilder"/> instance is on the <see cref="CorrespondenceAttachment.Data"/> step
/// </summary>
public interface ICorrespondenceAttachmentBuilderData
{
    /// <summary>
    /// Sets the data content of the attachment
    /// </summary>
    /// <param name="data">The data</param>
    ICorrespondenceAttachmentBuilder WithData(ReadOnlyMemory<byte> data);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceAttachmentBuilder"/> instance has completed all required steps and can proceed to <see cref="CorrespondenceAttachmentBuilder.Build"/>
/// </summary>
public interface ICorrespondenceAttachmentBuilder
    : ICorrespondenceAttachmentBuilderFilename,
        ICorrespondenceAttachmentBuilderName,
        ICorrespondenceAttachmentBuilderSendersReference,
        ICorrespondenceAttachmentBuilderDataType,
        ICorrespondenceAttachmentBuilderData
{
    /// <summary>
    /// Sets whether the attachment is encrypted or not
    /// </summary>
    /// <param name="isEncrypted">`true` for encrypted, `false` otherwise</param>
    ICorrespondenceAttachmentBuilder WithIsEncrypted(bool isEncrypted);

    /// <summary>
    /// Sets the storage location of the attachment data
    /// </summary>
    /// <remarks>In this context, it is extremely likely that the storage location is <see cref="CorrespondenceDataLocationType.ExistingCorrespondenceAttachment"/></remarks>
    /// <param name="dataLocationType">The data storage location</param>
    ICorrespondenceAttachmentBuilder WithDataLocationType(CorrespondenceDataLocationType dataLocationType);

    /// <summary>
    /// Builds the correspondence attachment
    /// </summary>
    CorrespondenceAttachment Build();
}
