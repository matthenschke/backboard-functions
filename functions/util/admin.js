const admin = require("firebase-admin");
var serviceAccount = require("../serviceAccount.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "database_url",
});
const db = admin.firestore();

module.exports = { admin, db };
