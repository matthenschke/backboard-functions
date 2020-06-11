const { db, admin } = require("../util/admin");
const firebase = require("firebase");
const config = require("../util/config");
firebase.initializeApp(config); // needed for access createUserWithEmailandPassword

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validate");

module.exports = {
  login: (req, res) => {
    const { email, password } = req.body;

    const { valid, errors } = validateLoginData({ email, password });
    if (!valid) {
      return res.status(400).json(errors);
    }
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((data) => {
        return data.user.getIdToken();
      })
      .then((token) => {
        return res.json({ token });
      })
      .catch((err) => {
        return res
          .status(500)
          .json({ general: "Wrong credentials, please try again" });
      });
  },
  signUp: (req, res) => {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle,
    };

    const noImg = "no-img.png";
    const { valid, errors } = validateSignupData(newUser);
    if (!valid) {
      return res.status(400).json(errors);
    }

    // TODO Validate Data
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return res
            .status(400)
            .json({ handle: "This handle is already taken" });
        } else {
          return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
      })
      .then((data) => {
        userId = data.user.uid;
        return data.user.getIdToken();
      })
      .then((result) => {
        token = result;
        const userCredentials = {
          handle: newUser.handle,
          email: newUser.email,
          createdAt: new Date().toISOString(),
          userId,
          imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        };
        return db.doc(`/users/${newUser.handle}`).create(userCredentials);
      })
      .then(() => {
        return res.status(201).json({
          token,
        });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === "auth/email-already-in-use") {
          return res.status(400).json({ email: "email is already in use" });
        } else {
          return res
            .status(500)
            .json({ general: "Something went wrong, please try again!" });
        }
      });
  },
  uploadImage: (req, res) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new BusBoy({ headers: req.headers });
    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        return res.status(400).json({ error: "wrong file type submitted" });
      }
      const imageExt = filename.split(".")[filename.split(".").length - 1];

      // 565664345676735.png
      imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExt}`;
      const filePath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filePath, mimetype };
      file.pipe(fs.createWriteStream(filePath));
    });

    busboy.on("finish", () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filePath, {
          resumable: false,
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        })
        .then(() => {
          console.log("hi");
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
          console.log(imageUrl);
          return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
          return res.json({ message: "Image uploaded successfully" });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: err.code });
        });
    });

    busboy.end(req.rawBody);
  },

  addUserDetails: (req, res) => {
    let userDetails = reduceUserDetails(req.body);
    db.doc(`/users/${req.user.handle}`)
      .update(userDetails)
      .then(() => {
        return res.json({ message: "details added successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  getAuthenticatedUser: (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.credentials = doc.data();
          return db
            .collection("likes")
            .where("userHandle", "==", req.user.handle)
            .get();
        }
        return res.status(404).json({ error: "user does not exist" });
      })
      .then((data) => {
        userData.likes = [];
        data.forEach((doc) => {
          userData.likes.push(doc.data());
        });
        return db
          .collection("notifications")
          .where("recipient", "==", req.user.handle)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get();
      })
      .then((data) => {
        userData.notifications = [];

        data.forEach((doc) => {
          console.log(doc.data());
          userData.notifications.push({
            ...doc.data(),
            id: doc.id,
          });
        });
        return res.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  getUserDetails: (req, res) => {
    const { userHandle } = req.params;
    console.log(userHandle);
    const userData = {};
    db.doc(`/users/${userHandle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.credentials = doc.data();
          return db
            .collection("buckets")
            .where("userHandle", "==", userHandle)
            .orderBy("createdAt", "desc")
            .get();
        }
        console.log("hi");
        return res.status(404).json({ error: "user not found" });
      })
      .then((snapshot) => {
        userData.buckets = [];
        snapshot.forEach((doc) => {
          userData.buckets.push({
            ...doc.data(),
            bucketId: doc.id,
          });
        });
        return res.json(userData);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ error: err.code });
      });
  },

  markNotificationsRead: (req, res) => {
    let batch = db.batch();
    const { notificationIds } = req.body;
    notificationIds.forEach((id) => {
      const notification = db.doc(`/notifications/${id}`);
      batch.update(notification, { read: true });
    });
    batch
      .commit()
      .then(() => {
        return res.json({ message: "notifications marked read" });
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ error: err });
      });
  },
};
