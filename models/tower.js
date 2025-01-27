const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

const Tower = sequelize.define('Tower', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  lat: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  lng: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  photo: {
    type: DataTypes.STRING
  },
  operators: {
    type: DataTypes.STRING // Тип остаётся STRING
  },
  status: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'towers',
  timestamps: false
});

module.exports = Tower;