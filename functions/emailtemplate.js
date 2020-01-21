const getProjectTemplate = document => {
  if (document) {
    switch (document.status.toLowerCase()) {
      case "waiting approval": {
        return {
          subject: "You just created a new project",
          msg: "Great! Wait a few hours, we are reviewing "
        };
      }
      case "waiting payment": {
        return {
          subject: "Your project has been accepted",
          msg: `Good news!, "${document.name}" has been accepted.`
        };
      }
      case "in progress": {
        return {
          subject: "Your payment was made.",
          msg: `The invoice is attached of "${document.name}"`
        };
      }
      case "rejected": {
        return {
          subject: "Sorry your project has been reject",
          msg: `Sorry, "${document.name}" does not fit our purpose.`
        };
      }
      default:
        return null;
    }
  } else {
    return null;
  }
};

const getEmailTemplateForModification = document => {
  if (document) {
    switch (document.status.toLowerCase()) {
      case "requested modification": {
        return {
          subject: "You just created a new project",
          msg: "Great! Wait a few hours, we are reviewing "
        };
      }
      case "modification accepted": {
        return {
          subject: "You just created a new project",
          msg: "Great! Wait a few hours, we are reviewing "
        };
      }
      case "modification rejected": {
        return {
          subject: "You just created a new project",
          msg: "Great! Wait a few hours, we are reviewing "
        };
      }
      default:
        return null;
    }
  } else {
    return null;
  }
};

module.exports = { getProjectTemplate, getEmailTemplateForModification };
