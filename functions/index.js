const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("../service-account.json");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors")({ origin: true });

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

exports.createAdmin = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(404).json({
      message: `${req.method} method not allowed`
    });
  }
  try {
    const record = await admin.auth().createUser({
      email: req.body.email,
      emailVerified: true,
      phoneNumber: req.body.phone,
      password: req.body.password,
      displayName: req.body.displayName
    });
    await admin.auth().setCustomUserClaims(record.uid, { role: "admin" });
    await admin
      .firestore()
      .collection("admin")
      .doc(record.uid)
      .set({
        email: req.body.email,
        phoneNumber: req.body.phone,
        displayName: req.body.displayName,
        role: "admin"
      });
    return res.status(201).json({
      success: true,
      record
    });
  } catch (err) {
    return res.status(422).json({
      success: false,
      message: err.message,
      error: err
    });
  }
});

exports.createModerator = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(404).json({
      message: `${req.method} method not allowed`
    });
  }
  try {
    const record = await admin.auth().createUser({
      email: req.body.email,
      emailVerified: true,
      phoneNumber: req.body.phone,
      password: req.body.password,
      displayName: req.body.displayName
    });
    await admin.auth().setCustomUserClaims(record.uid, { role: "moderator" });
    record.role = "moderator";
    await functions
      .firestore()
      .collection("admin")
      .doc(record.uid)
      .set(record);

    return res.status(201).json({
      success: true,
      record
    });
  } catch (err) {
    return res.status(422).json({
      success: false,
      message: err.message,
      error: err
    });
  }
});

exports.getAdmins = functions.https.onRequest(async (req, res) => {
  console.log(req.body.email);
  try {
    const record = await admin.auth();
    res.status(201).json(record);
  } catch (err) {
    res.status(422).json({
      success: false,
      message: err.message,
      error: err
    });
  }
});

exports.loginAdmin = functions.https.onRequest(async (req, res) => {
  console.log(req.body.email);
  try {
    const record = await admin.auth().getUserByEmail(req.body.email);
    if (record.customClaims.role) res.status(201).json(record);
  } catch (err) {
    res.status(422).json({
      success: false,
      message: err.message,
      error: err
    });
  }
});

app.use(bodyParser());
app.use(cors);
app.get("/hello", (req, res) => {
  res.send(`Hello`);
});
exports.app = functions.https.onRequest(app);
