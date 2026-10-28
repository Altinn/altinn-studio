# Correspondence

Localtest emulates the Correspondence API that apps use to send messages, such as the signing call to action each
signee receives and the receipt with the signed documents. studioctl points the app's
`PlatformSettings__ApiCorrespondenceEndpoint` at Localtest.

The wire models in [`Controllers/Correspondence`](../src/Controllers/Correspondence) mirror what the app libraries
send and read. Every response must include each field that the app's client marks `required`.

## Validation

Localtest repeats the checks of the real API that need only the request, with the same messages and error codes. It
looks up recipients among the parties in the test data. It is not a contract test, and the real API can refuse more.
Where Localtest cannot repeat a check exactly, such as for markdown in a title, its check is more lenient.

Localtest must never refuse a request that a deployed environment accepts. When you tighten a check, add a case to
the accepted requests in the correspondence tests.

Localtest does not check the resource registry, access to the resource, the service owner agreement, the contact
reservation register (KRR), confidentiality or Dialogporten. Test those in TT02.

## Idempotency

Apps rely on `idempotentKey`. A reused key answers 409 Conflict, which apps treat as already sent when they retry. As
in the real API, Localtest looks up the key after the model validation and before the other checks. So a retry that
has since become invalid, such as one whose due date has passed, still gets 409. Concurrent sends with one key create
one message.

## Attachments

Apps upload attachments the way the real API expects, and a correspondence may only reference published
attachments. Localtest publishes an upload once all of it is written. It does not scan for malware.

## Notifications

Localtest works out the notifications it would send, but does not send them. It applies the requested channel and
template to the recipient's contact information in the test data and to the custom recipients, and orders a reminder
a week later when asked. As in the real API, the channel decides once per registered person or organization, not per
address, and an email address or mobile number given as a custom recipient is notified whatever the channel. A
generic template's text stands in for the real API's wording.

## Seeing what an app sent

The Messages page at `/Messages` shows the stored correspondence with its attachments and notifications, and the
orders that apps placed directly with the Notifications API. Its _Clear messages_ button deletes exactly those, which
also forgets their idempotent keys. `studioctl env reset` deletes all Localtest data.

Localtest stores each correspondence as `{correspondenceId}.json` in the `correspondence` folder under its storage
path, with the request body the app sent. Attachments are in its `attachments` subfolder.
