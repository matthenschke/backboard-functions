const functions = require("firebase-functions");

const cors = require("cors");

const express = require("express");
const app = express();
const { db } = require("./util/admin");

const {
  getAllBuckets,
  createBucket,
  getBucket,
  addComment,
  addLike,
  removeLike,
  removeBucket,
} = require("./middleware/buckets");
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
app.get("/buckets", getAllBuckets);
app.post("/bucket", FBAuth, createBucket);
app.get("/bucket/:bucketId", getBucket);
app.post("/bucket/:bucketId/comment", FBAuth, addComment);
app.post("/bucket/:bucketId/like", FBAuth, addLike);
app.delete("/bucket/:bucketId/like", FBAuth, removeLike);
app.delete("/bucket/:bucketId", FBAuth, removeBucket);

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
    db.doc(`/buckets/${snapshot.data().bucketId}`)
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
            bucketId: doc.id,
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
    db.doc(`/buckets/${snapshot.data().bucketId}`)
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
    db.doc(`/buckets/${snapshot.data().bucketId}`)
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
            bucketId: doc.id,
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
        .collection("buckets")
        .where("userHandle", "==", userHandle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const bucket = db.doc(`/buckets/${doc.id}`);
            batch.update(bucket, { userImage: imageUrl });
          });
          return batch.commit();
        })
        .catch((err) => {
          console.error(err);
        });
    }
    return true;
  });

exports.onBucketDelete = functions.firestore
  .document("/buckets/{bucketId}") // {bucketId} is a params field provided by the context object
  .onDelete((snapshot, context) => {
    const bucketId = context.params.bucketId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("bucketId", "==", bucketId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          const comment = db.doc(`/comments/${doc.id}`);
          batch.delete(comment);
        });
        return db.collection("likes").where("bucketId", "==", bucketId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          const like = db.doc(`/likes/${doc.id}`);
          batch.delete(like);
        });
        return db
          .collection("notifications")
          .where("bucketId", "==", bucketId)
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
