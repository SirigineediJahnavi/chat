const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:you@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function notifyUser(subscription, sender, text) {
  const payload = { title: "New Message", body: `From ${sender}: ${text}` };
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

module.exports = { notifyUser };
