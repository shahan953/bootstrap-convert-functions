const functions = require("firebase-functions");
const admin = require("firebase-admin");

var serviceAccount = require("./service.js");
const express = require("express");
const emailtemp = require("./emailtemplate");
const app = express();
const stripeConfig = require("stripe");
const nodemailer = require("nodemailer");
let stripe;

// console.log(serviceAccount)

// let transport = nodemailer.createTransport({
//   host: "smtp.live.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: "sitesbelem@hotmail.com",
//     pass: "maximo11994"
//   }
// });

const transport = nodemailer.createTransport({
  service: "yandex",
  auth: {
    user: "emon@consoleit.io",
    pass: "3m0nd4r0ck"
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});

// let transport = nodemailer.createTransport({
//   host: "smtp.mailtrap.io",
//   port: 2525,
//   auth: {
//     user: "fe42209a9f7a0e",
//     pass: "e89776082391bf"
//   }
// });

//admin.initializeApp(functions.config().firebase);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//----------Email Notification--------------//
// exports.onProjectStatusChange = functions.firestore
//   .document("projects/{projectsId}")
//   .onWrite(async (change, ctx) => {
//     const newDocument = change.after.exists ? change.after.data() : {};
//     const oldDocument = change.before.exists ? change.before.data() : {};

//     if (oldDocument.status === newDocument.status) {
//       return null;
//     }

//     var etemp = await emailtemp.getProjectTemplate(newDocument);

//     if (etemp) {
//       const message = {
//         from: "help@designconvert.io",
//         to: newDocument.meta.user.email,
//         subject: etemp.subject,
//         html: `<b> ${etemp.subject}</b><br><br>  ${etemp.msg}`
//       };

//       try {
//         const sendMail = await transport.sendMail(message);
//         console.log(sendMail);
//         return sendMail;
//       } catch (err) {
//         return null;
//       }
//     } else {
//       return null;
//     }
//   });

exports.onProjectStatusChange = functions.firestore
  .document("projects/{projectsId}")
  .onWrite(async (change, ctx) => {
    const newDocument = change.after.exists ? change.after.data() : {};
    const oldDocument = change.before.exists ? change.before.data() : {};

    if (oldDocument.status === newDocument.status) {
      return null;
    }

    var etemp = await emailtemp.getProjectTemplate(newDocument);

    if (etemp) {
      const message = {
        from: "help@designconvert.io",
        to: newDocument.meta.user.email,
        subject: etemp.subject,
        html: `<b> ${etemp.subject}</b><br><br>  ${etemp.msg}`
      };

      try {
        const sendMail = await transport.sendMail(message);
        console.log(sendMail);
        return sendMail;
      } catch (err) {
        return null;
      }
    } else {
      return null;
    }
  });

// exports.onModificationStatusChange = functions.firestore
//   .document("modifications/{modificationId}")
//   .onWrite(async (change, ctx) => {
//     const newDocument = change.after.exists ? change.after.data() : {};
//     const oldDocument = change.before.exists ? change.before.data() : {};

//     if (
//       !newDocument.uid &&
//       !ctx.auth.token.admin &&
//       !ctx.auth.token.moderator
//     ) {
//       try {
//         await admin
//           .firestore()
//           .collection("modifications")
//           .doc(ctx.params.modificationId)
//           .update({
//             uid: ctx.auth.uid
//           });
//       } catch (error) {
//         console.log(error);
//         return null;
//       }
//     }

//     if (oldDocument.status === newDocument.status) {
//       return null;
//     }

//     var etemp = await emailtemp.getEmailTemplateForModification(newDocument);

//     // if (etemp) {
//     //   const message = {
//     //     from: "help@designconvert.io",
//     //     to: newDocument.meta.user.email,
//     //     subject: etemp.subject,
//     //     html: `<b> ${etemp.subject}</b><br><br>  ${etemp.msg}`
//     //   };

//     //   try {
//     //     const sendMail = await transport.sendMail(message);
//     //     console.log(sendMail);
//     //     return sendMail;
//     //   } catch (err) {
//     //     return null;
//     //   }
//     // } else {
//     //   return null;
//     // }
//   });

exports.idVerification = functions.firestore
  .document("verification/{verificationId}")
  .onCreate((snap, ctx) => {
    console.log("Hello how are you?");
    // const data = snap.data();
    console.log(data);
    // await admin
    //   .auth()
    //   .setCustomUserClaims(ctx.auth.uid, { identication: data.id });
    console.log(ctx.auth.uid, ctx.params);
    // return admin
    //   .firestore()
    //   .collection("users")
    //   .doc(ctx.auth.uid)
    //   .update({
    //     identication: ctx.params.verificationId
    //   });
  });

//----------Email Notification--------------//
// exports.sendProjectEmail = functions.https.onCall(async (data, ctx) => {
//   const { project } = data;

//   console.log(project);

//   var etemp = await emailtemp.getProjectTemplate(project);

//   if (etemp) {
//     const message = {
//       from: "sitesbelem@hotmail.com",
//       to: project.meta.user.email,
//       subject: etemp.subject,
//       html: `<b> ${etemp.subject}</b><br><br>  ${etemp.msg}`
//     };

//     console.log(message);

//     try {
//       const sendMail = await transport.sendMail(message);
//       console.log(sendMail);
//       return {
//         code: "SUCCESS",
//         message: "Email successfully sent"
//       };
//     } catch (err) {
//       console.log(err);
//       return {
//         code: "FAILED",
//         message: "Cannot send email"
//       };
//     }
//   } else {
//     return {
//       code: "FAILED",
//       message: "Cannot send email"
//     };
//   }
// });

//----------Email Notification--------------//
exports.stripeCharge = functions.https.onCall(async (data, ctx) => {
  const { token, description, projectId, modificationId } = data;
  const paymentRef = admin.firestore().collection("payments");
  const projectRef = admin.firestore().collection("projects");
  const modificationRef = admin.firestore().collection("modifications");
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
    const user = userData ? userData.data() : {};
    // console.log(user);

    if (testApiEnabled) {
      stripe = stripeConfig(testSecretKey);
    } else {
      stripe = stripeConfig(stripeSecret);
    }

    const { email, uid } = ctx.auth.token;

    // let modification = project.modification.find(
    //   item => String(item.createdAt) === String(modificationId) && item
    // );

    let modification = {};

    let totalPayable = 0;

    if (modificationId) {
      let result3 = await modificationRef.doc(modificationId).get();
      modification = result3 ? result3.data() : {};
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
            line1: user.address || "",
            line2: user.address || "",
            state: user.state || "",
            city: user.city || "",
            country: user.country || ""
          }
        }
      },
      {
        idempotency_key: paymentId
      }
    );

    await stripe.invoices.create({ customer: customer.id }, (err, invoice) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Inoice", invoice);
      }
    });

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
      message: "Payment successfull",
      charge
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

exports.updateMyProfile = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token) {
    const { id } = data;
    delete data.id;
    try {
      const record = await admin.auth().updateUser(ctx.auth.uid, data);
      return {
        success: true,
        message: "User successfully updated",
        record
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        message: err.message
      };
    }
  } else {
    return {
      success: false,
      message: "Unauthorize"
    };
  }
});

exports.updateUserProfileByAdmin = functions.https.onCall(async (data, ctx) => {
  if (ctx.auth.token.admin || ctx.auth.token.moderator) {
    console.log(data.id);
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

exports.api = functions.https.onRequest(app);
