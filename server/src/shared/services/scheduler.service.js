export const schedulerService = {
  async scheduleReminder(reminder) {
    return {
      scheduled: true,
      reminder
    };
  }
};
