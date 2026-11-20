namespace Altinn.Studio.Observability.Proxy.Auth;

/// <summary>
/// Which of an identity's accepted tokens a source presented, by its position in the identity's
/// list in the token file: the first is the current token, and any later one a previous token that
/// is still accepted while a rotation is under way. Outside a rotation the list holds one value.
///
/// During a rotation the new token is first accepted in the previous slot, and the slots swap once
/// it is; a source still presenting the previous slot after the swap has not moved yet.
/// </summary>
internal enum TokenSlot
{
    Current,
    Previous,
}
