'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Appliances', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    console.log('✅ Added deletedAt column to Appliances');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Appliances', 'deletedAt');
    console.log('✅ Removed deletedAt from Appliances');
  }
};