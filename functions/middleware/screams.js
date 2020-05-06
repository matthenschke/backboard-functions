const { db } = require("../util/admin");

module.exports = {
  createScream: (req, res) => {
    const newScream = {
      body: req.body.body,
      userHandle: req.user.handle,
      createdAt: new Date().toISOString(),
      userImage: req.user.imageUrl,
      likeCount: 0,
      commentCount: 0,
    };
    if (newScream.body.trim() === "") {
      return res.status(400).json({ body: "Must not be empty" });
    }
    db.collection("screams")
      .add(newScream)
      .then((doc) => {
        const resScream = newScream;
        resScream.screamId = doc.id;
        return res.json(resScream);
      })
      .catch((e) => {
        console.error(e);
        return res.status(500).json({ error: "something went wrong" });
      });
  },
  getAllScreams: (req, res) => {
    db.collection("screams")
      .orderBy("createdAt", "desc")
      .get()
      .then((data) => {
        let screams = [];
        data.docs.forEach((doc) => {
          screams.push({
            screamId: doc.id,
            ...doc.data(),
          });
        });
        return res.json(screams);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },
  getScream: (req, res) => {
    let screamData = {};
    db.doc(`/screams/${req.params.screamId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "scream not found" });
        }
        screamData = doc.data();
        screamData.screamId = doc.id;
        return db
          .collection("comments")
          .where("screamId", "==", req.params.screamId)
          .orderBy("createdAt", "desc")
          .get();
      })
      .then((data) => {
        screamData.comments = [];
        data.forEach((doc) => {
          screamData.comments.push(doc.data());
        });
        return res.json(screamData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  addComment: (req, res) => {
    const { screamId } = req.params;
    const { body } = req.body;

    if (body.trim() === "") {
      return res.status(400).json({ comment: "Comment must not be empty" });
    }

    const newComment = {
      body,
      userHandle: req.user.handle,
      createdAt: new Date().toISOString(),
      screamId,
      userImage: req.user.imageUrl,
    };

    db.doc(`/screams/${screamId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "scream not found" });
        }

        return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      })
      .then(() => {
        return db.collection("comments").add(newComment);
      })
      .then((doc) => {
        return res.json({ message: `document ${doc.id}` });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },
  addLike: (req, res) => {
    const { screamId } = req.params;
    const newLike = {
      screamId,
      userHandle: req.user.handle,
    };

    const likeDocument = db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("screamId", "==", screamId)
      .limit(1);

    const screamDocument = db.doc(`/screams/${screamId}`);

    let screamData = {};

    screamDocument
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "scream not found" });
        }
        screamData = doc.data();
        screamData.id = doc.id;
        return likeDocument.get();
      })
      .then((data) => {
        if (data.empty) {
          return db
            .collection("likes")
            .add(newLike)
            .then(() => {
              screamData.likeCount++;
              return screamDocument.update({ likeCount: screamData.likeCount });
            })
            .then(() => {
              return res.json(screamData);
            });
        } else {
          return res.status(400).json({ error: "scream already liked" });
        }
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  removeLike: (req, res) => {
    const { screamId } = req.params;

    const likeDocument = db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("screamId", "==", screamId)
      .limit(1);

    const screamDocument = db.doc(`/screams/${screamId}`);

    let screamData = {};

    screamDocument
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "scream not found" });
        }
        screamData = doc.data();
        screamData.id = doc.id;
        return likeDocument.get();
      })
      .then((data) => {
        if (data.empty) {
          return res.status(400).json({ error: "scream already disliked" });
        } else {
          return db
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
              screamData.likeCount--;
              return screamDocument.update({ likeCount: screamData.likeCount });
            })
            .then(() => {
              return res.json(screamData);
            });
        }
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  removeScream: (req, res) => {
    const { screamId } = req.params;
    const document = db.doc(`/screams/${screamId}`);
    document
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "scream not found" });
        }
        if (doc.data().userHandle !== req.user.handle) {
          return res.status(403).json({ error: "unauthorized" });
        }

        return doc.ref.delete();
      })
      .then(() => {
        return res.json({ message: "scream deleted successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },
};
