const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
let expo = new Expo();

// 1. YOUR ACTUAL TOKEN FROM THE TERMINAL
const PUSH_TOKEN = 'ExponentPushToken[Gzly69HGY-6zeqpH0kv8u0]';

const sendTestNotification = async () => {
  // Check that the push token appears to be a valid Expo push token
  if (!Expo.isExpoPushToken(PUSH_TOKEN)) {
    console.error(`Push token ${PUSH_TOKEN} is not a valid Expo push token`);
    return;
  }

  // 2. THE MODIFIED MESSAGE COPY
  const messages = [{
    to: PUSH_TOKEN,
    sound: 'default',
    title: 'TrustMicro Bank Alert 🚀',
    body: 'If you see this, your notification system is LIVE!',
    data: { withSome: 'data' },
    priority: 'high',
    channelId: 'default', // Good for Android behavior
  }];

  console.log("Sending notification...");

  try {
    // Expo allows you to send notifications in "chunks" to be efficient
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];

    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("Success! Ticket received:", ticketChunk);
      tickets.push(...ticketChunk);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

sendTestNotification();