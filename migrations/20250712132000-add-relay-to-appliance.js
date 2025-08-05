'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // The relay column is now created in the initial migration
    // This migration does nothing
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // This migration does nothing
    return Promise.resolve();
  }
};
