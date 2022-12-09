const instanceIdRegExp = /(\d{1,10}\/[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12})/i;

export function getInstanceIdRegExp(arg?: { prefix?: string; postfix?: string; flags?: string }) {
  const { postfix, prefix, flags } = {
    postfix: '',
    prefix: '',
    ...(arg || {}),
  };
  if (!(prefix || postfix)) {
    return instanceIdRegExp;
  }
  return new RegExp(
    `${prefix}${prefix && '/'}${instanceIdRegExp.source}${postfix && (postfix !== '$' ? `/${postfix}` : postfix)}`,
    flags || instanceIdRegExp.flags,
  );
}
