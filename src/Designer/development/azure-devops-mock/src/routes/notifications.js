import { v4 as uuid } from 'uuid';

const idempotencyIds = {};

export const notificationRoute = async (req, res) => {
  const id = req.body.idempotencyId;

  if (id in idempotencyIds) {
    console.log(`[${id}]: Notification order was created previously.`);
    res.status(200).json(idempotencyIds[id]);
    return;
  }

  if (req.body.recipient.recipientEmail) {
    const {
      emailAddress,
      emailSettings: { senderEmailAddress, subject, body },
    } = req.body.recipient.recipientEmail;
    console.log(
      `[${id}]: Notification email sent: ${JSON.stringify({ to: emailAddress, from: senderEmailAddress, subject, body }, null, 2)}`,
    );
  }

  if (req.body.recipient.recipientSms) {
    const {
      phoneNumber,
      smsSettings: { sender, body },
    } = req.body.recipient.recipientSms;
    console.log(
      `[${id}]: Notification sms sent: ${JSON.stringify({ to: phoneNumber, from: sender, body }, null, 2)}`,
    );
  }

  idempotencyIds[id] = {
    notificationOrderId: uuid(),
    notification: {
      shipmentId: uuid(),
      // sendersReference: not used
      // reminders: not used
    },
  };
  res.status(201).json(idempotencyIds[id]);
};
