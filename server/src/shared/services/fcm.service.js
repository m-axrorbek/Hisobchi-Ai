export const fcmService = {
  async sendPush(payload) {
    return {
      delivered: false,
      payload,
      reason: "FCM credentials not configured in scaffold"
    };
  }
};
