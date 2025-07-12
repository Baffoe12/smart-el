#!/bin/bash
# Deployment script to install dependencies and start the server

echo "Installing dependencies..."
npm install

echo "Running database migrations..."
npx sequelize-cli db:migrate

echo "Starting the server..."
npm start
