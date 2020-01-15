const functions = require("firebase-functions");
const admin = require("firebase-admin");

var serviceAccount = require("../functions/service.json");
const express = require("express");
const emailtemp = require("./emailtemplate.js");
const app = express();
const stripeConfig = require("stripe");
const nodemailer = require("nodemailer");
let stripe;

let transport = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "0134a53a2f25bf",
    pass: "48cc1d3b2c8d70"
  }
});

//admin.initializeApp(functions.config().firebase);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//----------Email Notification--------------//
exports.emailNotification = functions.https.onCall(async (data, ctx) => {
  const { projectId } = data;
  var record = await admin
    .firestore()
    .collection("projects")
    .doc(projectId)
    .get();

  var etemp = await emailtemp.getEmailTemplate(record.data().status);

  const message = {
    from: "elonmusk@tesla.com",
    to: "shuvojit.kar1@gmail.com",
    subject: etemp.subject,
    html: `<b> ${etemp.subject}</b><br><br>  ${etemp.msg}`
  };
  await transport.sendMail(message);

  try {
    return {
      success: true,
      message: "notification Sent"
    };
  } catch (err) {
    return {
      success: false,
      error: err,
      message: err.message
    };
  }
});

//----------Email Notification--------------//

exports.stripeCharge = functions.https.onCall(async (data, ctx) => {
  const { token, amount, description, projectId, modificationId } = data;
  const paymentRef = admin.firestore().collection("payments");
  const projectRef = admin.firestore().collection("projects");
  const userRef = admin.firestore().collection("users");
  const paymentId = paymentRef.doc().id;

  const record2 = await projectRef.doc(projectId).get();

  try {
    const record = await admin
      .firestore()
      .collection("settings")
      .doc("payment")
      .get();
    const { stripeSecret, testSecretKey, testApiEnabled } = record.data();
    const project = record2.data();

    const userData = await userRef.doc(project.uid).get();

    if (testApiEnabled) {
      stripe = stripeConfig(testSecretKey);
    } else {
      stripe = stripeConfig(stripeSecret);
    }

    const { email, uid } = ctx.auth.token;
    let modification = project.modification.find(
      item => String(item.createdAt) === String(modificationId) && item
    );
    let totalPayable = 0;

    if (modificationId && modification) {
      totalPayable = parseFloat(modification.price);
    } else {
      totalPayable = parseFloat(project.price);
    }

    if (!totalPayable || totalPayable <= 0) {
      return {
        success: false,
        message: "Invalid amount"
      };
    }

    const customer = await stripe.customers.create({
      email: email,
      source: token.id
    });

    const charge = await stripe.charges.create(
      {
        amount: 100 * totalPayable.toFixed(2),
        currency: "usd",
        description: description,
        customer: customer.id,
        receipt_email: email,
        metadata: {
          projectId
        },
        shipping: {
          name: token.card.name,
          address: {
            line1: userData ? userData.address : "",
            line2: userData ? userData.address : "",
            state: userData ? userData.state : "",
            city: userData ? userData.city : "",
            country: userData ? userData.country : ""
          }
        }
      },
      {
        idempotency_key: paymentId
      }
    );

    if (charge.status === "succeeded") {
      if (modification && modificationId) modification.status = "In Progress";

      if (project.status.toLowerCase() === "waiting payment" && !modificationId)
        project.status = "In Progress";

      await projectRef.doc(projectId).update(project);
      await paymentRef.doc(paymentId).set({
        project: {
          name: project.name,
          id: project.id
        },
        projectId: project.id,
        modification: modification ? modification : false,
        userId: uid,
        charge
      });
    }

    return {
      success: true,
      message: "Payment successfull"
    };
  } catch (err) {
    return {
      success: false,
      error: err,
      message: err.message
    };
  }
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
  if (!ctx.auth.token.admin) {
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
        message: `Sucess! ${data.email} has been made an ${data.role}`,
        isNew: false,
        user
      };
    } else {
      const record = await admin.auth().createUser({
        email: data.email,
        emailVerified: true,
        password: data.password,
        displayName: data.displayName
      });
      await admin.auth().setCustomUserClaims(record.uid, { [data.role]: true });
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
        message: `Sucess! ${data.email} has been made an ${data.role}!`,
        isNew: true,
        user: record
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
  if (!ctx.auth) {
    return {
      success: false,
      message: "Unauthorized"
    };
  }
  if (!ctx.auth.token.admin && !ctx.auth.token.moderator) {
    return {
      success: false,
      message: "Permission denied",
      line: 121,
      token: ctx.auth.token
    };
  }
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
    return usr;
  });
  return {
    success: true,
    result: {
      admins,
      moderators
    },
    nextPage: result.pageToken
  };
});

exports.deleteAdmin = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token.admin) {
    try {
      await admin.auth().deleteUser(data.uid);
      // await admin
      //   .firestore()
      //   .collection("admin")
      //   .doc(data.uid)
      //   .delete();
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

exports.deleteUserByAdmin = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token.admin) {
    try {
      await admin.auth().deleteUser(data.uid);
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

exports.updateProfile = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token.admin || ctx.auth.token.moderator) {
    try {
      const record = await admin.auth().updateUser(ctx.auth.uid, data);

      return {
        success: true,
        message: "User successfully updated",
        record
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

exports.updateUserProfileByAdmin = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token.admin || ctx.auth.token.moderator) {
    // console.log(data.id)
    const { id } = data;
    delete data.id;
    try {
      const record = await admin.auth().updateUser(id, data);
      return {
        success: true,
        message: "User successfully updated",
        record
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

exports.updateContact = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token.admin || ctx.auth.token.moderator) {
    try {
      const record = await admin
        .firestore()
        .collection("admin")
        .doc(ctx.auth.uid)
        .update(data);

      return {
        success: true,
        message: "User successfully updated",
        record
      };
    } catch (err) {
      if (err.code === 5) {
        // No data associated with this id. So create new one
        try {
          Object.assign(data, {
            email: ctx.auth.token.email,
            id: ctx.auth.uid
          });
          const record = await admin
            .firestore()
            .collection("admin")
            .doc(ctx.auth.uid)
            .set(data);
          return {
            success: true,
            message: "User successfully updated",
            record
          };
        } catch (error) {
          return {
            success: false,
            message: error.message,
            error
          };
        }
      } else {
        return {
          success: false,
          message: err.message,
          err
        };
      }
    }
  } else {
    return {
      success: false,
      message: "Permission denined"
    };
  }
});

// app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.get("/helloworld", (req, res) => {
//   console.log("hello");

//   res.json({
//     ins: JSON.parse(admin.getToken())
//   });
// });

exports.testApi = functions.https.onCall(async (data, ctx) => {
  // console.log(req.headers.autorization);
  // if (req.method !== "POST") {
  //   return res.status(404).json({
  //     message: `${req.method} method not allowed`
  //   });
  // }
  try {
    return {
      message: "OK",
      auth: ctx.auth.token
    };
  } catch (err) {
    return {
      message: err.message
    };
  }
});

exports.api = functions.https.onRequest(app);
