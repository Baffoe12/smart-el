'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sensor_data', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      appliance_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Appliances',
          key: 'id'
        }
      },
      current: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      voltage: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      power: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      energy: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      cost: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: true
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: 'Devices',
          key: 'device_id'
        }
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('sensor_data', ['appliance_id']);
    await queryInterface.addIndex('sensor_data', ['device_id']);
    await queryInterface.addIndex('sensor_data', ['timestamp']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sensor_data');
  }
};
