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

exports.createFirstAdmin = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(404).json({
      message: `${req.method} method not allowed`
    });
  }
  try {
    const record = await admin.auth().createUser({
      email: req.body.email,
      emailVerified: true,
      password: req.body.password,
      displayName: req.body.displayName || ""
    });
    await admin.auth().setCustomUserClaims(record.uid, { admin: true });
    await admin
      .firestore()
      .collection("admin")
      .doc(record.uid)
      .set({
        email: req.body.email,
        admin: true,
        displayName: req.body.displayName || "",
        phoneNumber: req.body.phoneNumber || ""
      });

    return res.status(201).json({
      success: true,
      record: record.toJSON()
    });
  } catch (err) {
    return res.status(422).json({
      success: false,
      message: err.message,
      error: err
    });
  }
});

exports.createAdmin = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth.token) {
    return {
      success: false,
      message: "Unauthorized"
    };
  }
  if (!ctx.auth.token.admin || !ctx.auth.token.moderator) {
    return {
      success: false,
      message: "Permission denied"
    };
  }
  let user = false;
  try {
    user = await admin.auth().getUserByEmail(data.email);
  } catch (err) {
    user = false;
  }
  try {
    if (user) {
      await admin.auth().setCustomUserClaims(user.uid, {
        [data.role]: true
      });
      return {
        success: true,
        message: `Sucess! ${data.email} has been made an admin`
      };
    } else {
      const record = await admin.auth().createUser({
        email: data.email,
        emailVerified: true,
        password: data.password,
        displayName: data.displayName
      });
      await admin.auth().setCustomUserClaims(record.uid, { [data.role]: true });
      // record.admin = "admin";
      await admin
        .firestore()
        .collection("admin")
        .doc(record.uid)
        .set({
          email: data.email,
          [data.role]: true,
          displayName: data.displayName
        });

      return {
        success: true,
        message: `Sucess! ${data.email} has been made an ${data.role}`
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err.message,
      error: err
    };
  }
});

exports.getAdmins = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token && ctx.auth.token.admin) {
    let result = await admin.auth().listUsers(20);

    let admins = [];
    let moderators = [];
    result.users.forEach(user => {
      const usr = user.toJSON();
      if (usr.customClaims) {
        if (usr.customClaims.admin) {
          return admins.push(usr);
        } else if (usr.customClaims.moderator) {
          return moderators.push(usr);
        }
      }
    });
    return {
      success: true,
      result: {
        admins,
        moderators
      },
      nextPage: result.pageToken
    };
  } else {
    return {
      success: false,
      message: "Permission denined"
    };
  }
});

exports.deleteUser = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token.admin) {
    try {
      await admin.auth().deleteUser(data.uid);
      await admin
        .firestore()
        .collection("admin")
        .doc(data.uid)
        .delete();
      return {
        success: true,
        message: "User successfully deleted"
      };
    } catch (err) {
      return {
        success: false,
        message: err.message
      };
    }
  } else {
    return {
      success: false,
      message: "Permission denined"
    };
  }
});

// app.use(cors);
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.get("/hello", (req, res) => {
//   res.send(`Hello`);
// });

// app.post("/create-admin", async (req, res) => {
//   // console.log(req.headers.autorization);
//   if (req.method !== "POST") {
//     return res.status(404).json({
//       message: `${req.method} method not allowed`
//     });
//   }
//   try {
//     const record = await admin.auth().createUser({
//       email: req.body.email,
//       emailVerified: true,
//       phoneNumber: req.body.phone,
//       password: req.body.password,
//       displayName: req.body.displayName
//     });
//     await admin.auth().setCustomUserClaims(record.uid, { role: "admin" });
//     await admin
//       .firestore()
//       .collection("admin")
//       .doc(record.uid)
//       .set({
//         email: req.body.email,
//         phoneNumber: req.body.phone,
//         displayName: req.body.displayName,
//         role: "admin"
//       });
//     return res.status(201).json({
//       success: true,
//       record
//     });
//   } catch (err) {
//     return res.status(422).json({
//       success: false,
//       message: err.message,
//       error: err
//     });
//   }
// });

exports.api = functions.https.onRequest(app);
