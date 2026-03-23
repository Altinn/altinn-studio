using System;

namespace Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class AllowApiKeyAttribute : Attribute { }
