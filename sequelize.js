require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://electricity_db_user:b8u969CD8Rw5gjSuRySH9mp5KXQKhjlt@dpg-d1oqtrur433s73cmblk0-a.oregon-postgres.render.com/electricity_db', {
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
