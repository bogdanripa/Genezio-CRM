import { MailService } from "@genezio/email-service";

async function sendNotification(phone, message) {
  if (!phone) return;

  // This function would contain the logic to send a notification to the user
  await fetch(process.env.WA_URL + 'sendMessage', {
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

async function sendFeedback(name, email, phone, message) {
  await MailService.sendMail({
    emailServiceToken: process.env.EMAIL_SERVICE_TOKEN,
    to: "maya@mayacrm.ai",
    subject: "Maya CRM Feedback",
    text: `Feedback from ${name} (${email}, ${phone}):\n\n${message}`,
  });
}

export {sendNotification, sendFeedback}