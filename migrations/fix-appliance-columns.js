// migration: fix-appliance-columns.js
up: async (queryInterface, Sequelize) => {
  await queryInterface.renameColumn('Appliances', 'manuallyAdded', 'manually_added');
  await queryInterface.renameColumn('Appliances', 'scheduleOn', 'schedule_on');
  await queryInterface.renameColumn('Appliances', 'scheduleOff', 'schedule_off');
}