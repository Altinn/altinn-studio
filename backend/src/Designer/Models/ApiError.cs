using System;

namespace Altinn.Studio.Designer.Models
{
    public record ApiError(string ErrorCode, string Detail, DateTime Timestamp);
}
