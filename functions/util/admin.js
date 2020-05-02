const admin = require("firebase-admin");
require("dotenv").config();

var serviceAccount = require("../serviceAccount.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});
const db = admin.firestore();

module.exports = { admin, db };
