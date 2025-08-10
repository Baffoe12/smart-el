// migrations/XXXXXXXX-fix-appliance-columns.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename camelCase → snake_case (if they exist)
    const tableInfo = await queryInterface.describeTable('Appliances');

    if (tableInfo.manuallyAdded && !tableInfo.manually_added) {
      await queryInterface.renameColumn('Appliances', 'manuallyAdded', 'manually_added');
      console.log('✅ Renamed manuallyAdded → manually_added');
    }

    if (tableInfo.scheduleOn && !tableInfo.schedule_on) {
      await queryInterface.renameColumn('Appliances', 'scheduleOn', 'schedule_on');
      console.log('✅ Renamed scheduleOn → schedule_on');
    }

    if (tableInfo.scheduleOff && !tableInfo.schedule_off) {
      await queryInterface.renameColumn('Appliances', 'scheduleOff', 'schedule_off');
      console.log('✅ Renamed scheduleOff → schedule_off');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the rename
    const tableInfo = await queryInterface.describeTable('Appliances');

    if (tableInfo.manually_added) {
      await queryInterface.renameColumn('Appliances', 'manually_added', 'manuallyAdded');
    }
    if (tableInfo.schedule_on) {
      await queryInterface.renameColumn('Appliances', 'schedule_on', 'scheduleOn');
    }
    if (tableInfo.schedule_off) {
      await queryInterface.renameColumn('Appliances', 'schedule_off', 'scheduleOff');
    }
  }
};