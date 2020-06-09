const { db } = require("../util/admin");

module.exports = {
  createBucket: (req, res) => {
    const newBucket = {
      body: req.body.body,
      userHandle: req.user.handle,
      createdAt: new Date().toISOString(),
      userImage: req.user.imageUrl,
      likeCount: 0,
      commentCount: 0,
    };
    if (newBucket.body.trim() === "") {
      return res.status(400).json({ body: "Must not be empty" });
    }
    db.collection("buckets")
      .add(newBucket)
      .then((doc) => {
        const resBucket = newBucket;
        resBucket.bucketId = doc.id;
        return res.json(resBucket);
      })
      .catch((e) => {
        console.error(e);
        return res.status(500).json({ error: "something went wrong" });
      });
  },
  getAllBuckets: (req, res) => {
    db.collection("buckets")
      .orderBy("createdAt", "desc")
      .get()
      .then((data) => {
        let buckets = [];
        data.docs.forEach((doc) => {
          buckets.push({
            bucketId: doc.id,
            ...doc.data(),
          });
        });
        return res.json(buckets);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },
  getBucket: (req, res) => {
    let bucketData = {};
    db.doc(`/buckets/${req.params.bucketId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "bucket not found" });
        }
        bucketData = doc.data();
        bucketData.bucketId = doc.id;
        return db
          .collection("comments")
          .where("bucketId", "==", req.params.bucketId)
          .orderBy("createdAt", "desc")
          .get();
      })
      .then((data) => {
        bucketData.comments = [];
        data.forEach((doc) => {
          bucketData.comments.push(doc.data());
        });
        return res.json(bucketData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  addComment: (req, res) => {
    const { bucketId } = req.params;
    const { body } = req.body;

    if (body.trim() === "") {
      return res.status(400).json({ comment: "Comment must not be empty" });
    }

    const newComment = {
      body,
      userHandle: req.user.handle,
      createdAt: new Date().toISOString(),
      bucketId,
      userImage: req.user.imageUrl,
    };

    db.doc(`/buckets/${bucketId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "bucket not found" });
        }

        return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      })
      .then(() => {
        return db.collection("comments").add(newComment);
      })
      .then((doc) => {
        return res.json(newComment);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },
  addLike: (req, res) => {
    const { bucketId } = req.params;
    const newLike = {
      bucketId,
      userHandle: req.user.handle,
    };

    const likeDocument = db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("bucketId", "==", bucketId)
      .limit(1);

    const bucketDocument = db.doc(`/buckets/${bucketId}`);

    let bucketData = {};

    bucketDocument
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "bucket not found" });
        }
        bucketData = doc.data();
        bucketData.bucketId = doc.id;
        return likeDocument.get();
      })
      .then((data) => {
        if (data.empty) {
          return db
            .collection("likes")
            .add(newLike)
            .then(() => {
              bucketData.likeCount++;
              return bucketDocument.update({ likeCount: bucketData.likeCount });
            })
            .then(() => {
              return res.json(bucketData);
            });
        } else {
          return res.status(400).json({ error: "bucket already liked" });
        }
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  removeLike: (req, res) => {
    const { bucketId } = req.params;

    const likeDocument = db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("bucketId", "==", bucketId)
      .limit(1);

    const bucketDocument = db.doc(`/buckets/${bucketId}`);

    let bucketData = {};

    bucketDocument
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "bucket not found" });
        }
        bucketData = doc.data();
        bucketData.bucketId = doc.id;
        return likeDocument.get();
      })
      .then((data) => {
        if (data.empty) {
          return res.status(400).json({ error: "bucket already disliked" });
        } else {
          return db
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
              bucketData.likeCount--;
              return bucketDocument.update({ likeCount: bucketData.likeCount });
            })
            .then(() => {
              return res.json(bucketData);
            });
        }
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },

  removeBucket: (req, res) => {
    const { bucketId } = req.params;
    const document = db.doc(`/buckets/${bucketId}`);
    document
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "bucket not found" });
        }
        if (doc.data().userHandle !== req.user.handle) {
          return res.status(403).json({ error: "unauthorized" });
        }

        return doc.ref.delete();
      })
      .then(() => {
        return res.json({ message: "bucket deleted successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  },
};
