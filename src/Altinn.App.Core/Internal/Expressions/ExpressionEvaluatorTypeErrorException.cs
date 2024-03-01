using System.Runtime.Serialization;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Custom exception for <see cref="ExpressionEvaluator" /> to thow when expressions contains type errors.
/// </summary>
public class ExpressionEvaluatorTypeErrorException : Exception
{
    /// <inheritdoc />
    public ExpressionEvaluatorTypeErrorException(string msg) : base(msg) { }
    /// <inheritdoc />
    public ExpressionEvaluatorTypeErrorException(string msg, Exception innerException) : base(msg, innerException) { }
}