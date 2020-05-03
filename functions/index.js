const functions = require("firebase-functions");

const express = require("express");
const app = express();
const { db } = require("./util/admin");

const {
  getAllScreams,
  createScream,
  getScream,
  addComment,
  addLike,
  removeLike,
  removeScream,
} = require("./middleware/screams");
const {
  login,
  signUp,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require("./middleware/users");
const FBAuth = require("./util/fbAuth");

app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, createScream);
app.get("/scream/:screamId", getScream);
app.post("/scream/:screamId/comment", FBAuth, addComment);
app.post("/scream/:screamId/like", FBAuth, addLike);
app.delete("/scream/:screamId/like", FBAuth, removeLike);
app.delete("/scream/:screamId", FBAuth, removeScream);

app.post("/signup", signUp);
app.post("/login", login);
app.post("/users/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:userHandle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

// function that uses cloud firestore triggers
exports.createNotificationOnLike = functions.firestore
  .document("/likes/{id}")
  .onCreate((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          snapshot.data().userHandle !== doc.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            screamId: doc.id,
          });
        }
        return;
      })
      .then(() => {
        return;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.deleteNotificationOnDislike = functions.firestore
  .document("/likes/{id}")
  .onDelete((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          db.doc(`/notifications/${snapshot.id}`).delete();
        }
        return;
      })
      .then(() => {
        return;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });
exports.createNotificationOnComment = functions.firestore
  .document("/comments/{id}")
  .onCreate((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          snapshot.data().userHandle !== doc.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            screamId: doc.id,
          });
        }
        return;
      })
      .then(() => {
        return;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });
