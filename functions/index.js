const functions = require("firebase-functions");

const cors = require("cors");

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

app.use(cors());
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, createScream);
app.get("/scream/:screamId", getScream);
app.post("/scream/:screamId/comment", FBAuth, addComment);
app.post("/scream/:screamId/like", FBAuth, addLike);
app.delete("/scream/:screamId/like", FBAuth, removeLike);
app.delete("/scream/:screamId", FBAuth, removeScream);

app.post("/signup", signUp);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
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
        return true;
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.deleteNotificationOnDislike = functions.firestore
  .document("/likes/{id}")
  .onDelete((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return db.doc(`/notifications/${snapshot.id}`).delete();
        }
        return false;
      })
      .catch((err) => {
        console.error(err);
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
        return true;
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.onUserImageChanged = functions.firestore
  .document("/users/{userId}")
  .onUpdate((change) => {
    const { before, after } = change;
    if (before.data().imageUrl !== after.data().imageUrl) {
      const { imageUrl, handle: userHandle } = change.after.data();
      const batch = db.batch();
      return db
        .collection("screams")
        .where("userHandle", "==", userHandle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { userImage: imageUrl });
          });
          return batch.commit();
        })
        .catch((err) => {
          console.error(err);
        });
    }
    return true;
  });

exports.onScreamDelete = functions.firestore
  .document("/screams/{screamId}") // {screamId} is a params field provided by the context object
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("screamId", "==", screamId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          const comment = db.doc(`/comments/${doc.id}`);
          batch.delete(comment);
        });
        return db.collection("likes").where("screamId", "==", screamId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          const like = db.doc(`/likes/${doc.id}`);
          batch.delete(like);
        });
        return db
          .collection("notifications")
          .where("screamId", "==", screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          const notification = db.doc(`/notifications/${doc.id}`);
          batch.delete(notification);
        });
        return batch.commit();
      })
      .catch((err) => {
        console.error(err);
      });
  });
