'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Appliances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      relay: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      current: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      voltage: {
        type: Sequelize.FLOAT,
        defaultValue: 220
      },
      power: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      amount: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      isOn: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Appliances');
  }
};
