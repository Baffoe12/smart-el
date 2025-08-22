require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://smart_board_db_user:b5snzDzkCBkc7gjRdFCxVktl4CxBkpN9@dpg-d2kfmnbipnbc73f2lb20-a.oregon-postgres.render.com/smart_board_db', {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

module.exports = sequelize;
