function getEmailTemplate(str) {
  switch (str.toLowerCase()) {
    case "waiting approval": {
      return {
        subject: "You just created a new project",
        msg: "Great! Wait a few hours, we are reviewing "
      };
    }
    case "waiting payment": {
      return {
        subject: "You just created a new project",
        msg: "Great! Wait a few hours, we are reviewing "
      };
    }
    case "in progress": {
      return {
        subject: "You just created a new project",
        msg: "Great! Wait a few hours, we are reviewing your project "
      };
    }
    case "rejected": {
      return {
        subject: "You just created a new project",
        msg: "Great! Wait a few hours, we are reviewing "
      };
    }
    case "finished": {
      return {
        subject: "You just created a new project",
        msg: "Great! Wait a few hours, we are reviewing "
      };
    }
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
    case "done": {
      return {
        subject: "You just created a new project",
        msg: "Great! Wait a few hours, we are reviewing "
      };
    }
    default:
      return {
        subject: "",
        msg: ""
      };
  }
}

module.exports = { getEmailTemplate };
