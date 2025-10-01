using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Custom exception for <see cref="ExpressionEvaluator" /> to thow when expressions contains type errors.
/// </summary>
public class ExpressionEvaluatorTypeErrorException : AltinnException
{
    /// <inheritdoc />
    public ExpressionEvaluatorTypeErrorException(string msg)
        : base(msg) { }

    /// <summary>
    /// Create an exception with the json representation of the args.
    /// </summary>
    /// <param name="msg">the message</param>
    /// <param name="method">the method name</param>
    /// <param name="args">the list of evaluated arguments</param>
    internal ExpressionEvaluatorTypeErrorException(string msg, ExpressionFunction method, ExpressionValue[] args)
        : base(
            $"Type error in expression: {msg} with args: [\"{method}\" {string.Join(", ", args.Select(a => a.ToString()))}]"
        ) { }

    /// <inheritdoc />
    public ExpressionEvaluatorTypeErrorException(string msg, Exception innerException)
        : base(msg, innerException) { }
}
