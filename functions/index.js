const functions = require("firebase-functions");

const express = require("express");
const app = express();

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
} = require("./middleware/users");
const FBAuth = require("./util/fbAuth");

app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, createScream);
app.get("/scream/:screamId", getScream);
app.post("/scream/:screamId/comment", FBAuth, addComment);
app.post("/scream/:screamId/like", FBAuth, addLike);
app.delete("/scream/:screamId/like", FBAuth, removeLike);
app.delete("/scream/:screamId", FBAuth, removeScream);

// TODO : delete scream
// TODO : like scream
// TODO : unlike scream
// TODO : comment scream

app.post("/signup", signUp);
app.post("/login", login);
app.post("/users/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);
