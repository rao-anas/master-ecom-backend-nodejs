/**
 * Script to create an admin user
 * Usage: node scripts/create-admin.js <email> <password> <firstName> <lastName>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const connectDB = require('../src/config/database');

async function createAdmin() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');

    // Get arguments
    const args = process.argv.slice(2);
    if (args.length < 4) {
      console.error('Usage: node scripts/create-admin.js <email> <password> <firstName> <lastName>');
      process.exit(1);
    }

    const [email, password, firstName, lastName] = args;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists. Updating to admin role...`);
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`✅ User ${email} is now an admin!`);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
    });

    console.log(`✅ Admin user created successfully!`);
    console.log(`Email: ${admin.email}`);
    console.log(`Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`Role: ${admin.role}`);
    console.log(`ID: ${admin._id}`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();

