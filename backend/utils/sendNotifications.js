const { Expo } = require('expo-server-sdk');
let expo = new Expo();

const sendPushNotification = async (targetExpoToken, title, body) => {
    if (!Expo.isExpoPushToken(targetExpoToken)) {
        console.error(`Push token ${targetExpoToken} is not a valid Expo push token`);
        return;
    }

    let messages = [{
        to: targetExpoToken,
        sound: 'default',
        title: title,
        body: body,
        data: { withSome: 'data' },
    }];

    try {
        await expo.sendPushNotificationsAsync(messages);
    } catch (error) {
        console.error(error);
    }
};

module.exports = sendPushNotification;