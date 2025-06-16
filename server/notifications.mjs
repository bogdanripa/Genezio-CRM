async function sendNotification(phone, message) {
  if (!phone) return;

  // This function would contain the logic to send a notification to the user
  await fetch(process.env.NOTIFICATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EMAIL_CODE_AUTH_SECRET}`,
      'x-genezio-call-async': 'true',
    },
    body: JSON.stringify({ phone, message }),
  })
  console.log(`Notification sent to user ${phone}: ${message}`);
}

export {sendNotification}