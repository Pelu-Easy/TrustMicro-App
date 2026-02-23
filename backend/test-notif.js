// backend/test-notif.js
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

// PASTE YOUR TOKEN HERE (Get this from your terminal/console log when the app starts)
const PUSH_TOKEN = 'ExponentPushToken[Gzly69HGY-6zeqpH0kv8u0]';

const sendTestNotification = async () => {
    if (!Expo.isExpoPushToken(PUSH_TOKEN)) {
        console.error(`Push token ${PUSH_TOKEN} is not a valid Expo push token`);
        return;
  }

  const messages = [{
    to: PUSH_TOKEN,
    sound: 'default',
    title: 'TrustMicro Bank Alert 🚀',
    body: 'If you see this, your notification system is LIVE!',
    data: { withSome: 'data' },
  }];

  try {
    console.log("Sending notification...");
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("Success! Ticket:", ticketChunk);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

sendTestNotification();