const admin = require("firebase-admin");
require("dotenv").config();
const { storageBucket } = require("./config");

var serviceAccount = require("../serviceAccount.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
  storageBucket: storageBucket,
});
const db = admin.firestore();

module.exports = { admin, db };
