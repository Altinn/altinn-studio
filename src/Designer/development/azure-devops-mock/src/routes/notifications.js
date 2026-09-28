import { v4 as uuid } from 'uuid';

const idempotencyIds = new Map();

export const notificationRoute = async (req, res) => {
  const id = req.body?.idempotencyId;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Missing or invalid idempotencyId' });
    return;
  }

  if (idempotencyIds.has(id)) {
    console.log(`[${id}]: Notification order was created previously.`);
    res.status(200).json(idempotencyIds.get(id));
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

  const order = {
    notificationOrderId: uuid(),
    notification: {
      shipmentId: uuid(),
      // sendersReference: not used
      // reminders: not used
    },
  };
  idempotencyIds.set(id, order);
  res.status(201).json(order);
};
