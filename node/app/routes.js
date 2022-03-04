const Message = require("./models/Message");
const User = require("./models/User");
const Contact = require("./models/Contact");
const Conversation = require("./models/Conversation");
const _ = require("lodash");
const ScheduleMessage = require("./models/ScheduleMessage");
const crypto = require("crypto");

const axios = require("axios");
const path = require("path");
const moment = require("moment");

const CONFIG = require("../config/config.json");

const phoneNumFormat = (number) => {
  var cleaned = ("" + number).replace(/\D/g, "");
  var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return "(" + match[2] + ") " + match[3] + "-" + match[4];
  }
  return null;
};

const CronJob = require("cron").CronJob;

const job = new CronJob("0 */3 * * * *", function () {
  const time1 = new Date(Date.now() - 30 * 60 * 1000);
  const time2 = new Date(Date.now() - 90 * 60 * 1000);

  const firstDate = new Date().getDate();
  const currentDate = moment().format("l");

  Message.find(
    {
      state: "0",
      email_alert: true,
      trash_flag: false,
      createdAt: {
        $gte: time2,
        $lte: time1,
      },
    },
    function (err, result) {
      if (err) {
        console.log(err);
      } else if (result && result.length > 0) {
        const array =
          result.length > 1
            ? result.filter(
                (elem, index, self) =>
                  self.findIndex(
                    (t) =>
                      t.from_number === elem.from_number &&
                      t.to_number === elem.to_number &&
                      JSON.stringify(t.createdAt).replace(/\.\d+/, "") ===
                        JSON.stringify(elem.createdAt).replace(/\.\d+/, "")
                  ) === index
              )
            : result;
        array.forEach((arr) => {
          AssignMainnum.find(
            {
              phoneNumber: arr.to_number,
              state: true,
            },
            function (err, assignNum) {
              if (assignNum) {
                assignNum.forEach((assign) => {
                  User.findOne(
                    {
                      userId: assign.userId,
                      emailAlert: true,
                    },
                    function (err, res) {
                      if (res) {
                        sendMailer(res.email, arr.to_number);
                        Message.updateOne(
                          {
                            _id: arr._id,
                            trash_flag: false,
                          },
                          { $set: { email_alert: false } },
                          function (err, result) {
                            if (err) {
                              return err;
                            }
                          }
                        );
                      }
                    }
                  );
                });
              }
            }
          );
        });
      }
    }
  );

  const curDate = new Date().toISOString();
});

function sendMailer(userMail, phoneNum) {
  const fromMail = "no_reply@venturetel.co";
  const text = `You have unread text messages to ${phoneNum}. Go to check and respond to these messages`;
  const subject = "VentureTel SMS Notification";
  const email = {
    from: fromMail,
    to: userMail,
    subject: subject,
    html: text,
  };
  transport.sendMail(email, function (err, info) {
    if (err) {
      console.log("error");
    } else {
      console.log("Message sent: " + info);
    }
  });
}
job.start();

module.exports = function (app, io) {
  app.post("/checkConversation", async function (req, res) {
    await Conversation.find(
      {},
      null,
      { sort: { updatedAt: "desc" } },
      async function (err, result) {
        if (result && result.length > 0) {
          const duplicates = result
            .map((el, i) => {
              return result.find((element, index) => {
                if (
                  i !== index &&
                  ((element.number1 === el.number1 &&
                    element.number2 === el.number2) ||
                    (element.number1 === el.number2 &&
                      element.number2 === el.number1))
                ) {
                  return el;
                }
              });
            })
            .filter((x) => x);
          res.send(duplicates);
        }
      }
    );
  });

  app.post("/userchk", function (req, res) {
    User.findOne(
      {
        userId: req.body.userId,
      },
      function (err, result) {
        if (!result) {
          const userData = {
            email: req.body.email,
            account_id: req.body.account_id,
            userId: req.body.userId,
            fcmToken: req.body.fcmToken,
            user_name: req.body.userName,
            last_signDate: Date.now(),
          };
          User.create(userData, function (err1, res1) {
            if (err1) {
              return;
            } else {
              res.send([]);
            }
          });
        } else {
          User.findOneAndUpdate(
            { userId: req.body.userId },
            {
              $set: { user_name: req.body.userName, last_signDate: Date.now() },
            },
            function (err2, res2) {
              if (!err2) res.send(res2);
            }
          );
        }
      }
    );
  });

  app.post("/checkFcmToken", function (req, res) {
    User.findOneAndUpdate(
      {
        userId: req.body.userId,
        account_id: req.body.account_id,
      },
      { $set: { fcmToken: req.body.fcmToken } },
      function (err, result) {
        if (err) {
          return err;
        } else {
          res.send(result);
        }
      }
    );
  });

  app.post("/webhook", function (req, resu) {
    let webhook = req.body;
    if (webhook.type === "missed_call") {
      if (webhook.notify && webhook.notify.event_name === "CHANNEL_DESTROY") {
        Automation.find(
          {
            phone_number: webhook.to_user,
          },
          function (err, result) {
            if (err) {
              console.log(err);
            } else {
              if (result && result.length > 0) {
                result.forEach(async (res) => {
                  if (res.type === "Missed Call" && res.status) {
                    const URL = `${CONFIG.Mssgae_URL}/users/${CONFIG.accountId}/messages`;
                    const data = {
                      to: [`${webhook.from_user}`],
                      from: webhook.to_user,
                      text: res.response,
                      applicationId: CONFIG.applicationId,
                      tag: "SMS",
                    };
                    await axios({
                      url: URL,
                      method: "post",
                      headers: { "content-type": "application/json" },
                      auth: {
                        username: CONFIG.apiToken,
                        password: CONFIG.apiSecret,
                      },
                      data: data,
                    })
                      .then((res1) => {
                        if (
                          res1 &&
                          res1.statusText === "Accepted" &&
                          res1.status === 202
                        ) {
                          const sendMsgData = {
                            from_number: webhook.to_user,
                            to_number: webhook.from_user,
                            text: res.response,
                            direction: "out",
                            message_id: res1.data.id,
                          };
                          axios.post(`${CONFIG.serverURL}/sendmessage`, {
                            sendMsgData,
                          });
                        }
                      })
                      .catch((error) => {
                        console.log(error);
                      });
                  }
                });
              }
            }
          }
        );
      }
    }
    resu.sendStatus(200);
  });

  app.post("/sendnewmessages", async function (req, result) {
    const { data } = req.body;
    let sendData = null;
    if (data.uploadImgName !== "") {
      sendData = {
        to: [data.toNumber],
        from: data.fromNumber,
        text: data.text,
        applicationId: CONFIG.applicationId,
        media: [`${CONFIG.serverURL}/mms_images/${data.uploadImgName}`],
        tag: "SMS",
      };
    } else {
      sendData = {
        to: [data.toNumber],
        from: data.fromNumber,
        text: data.text,
        applicationId: CONFIG.applicationId,
        tag: "SMS",
      };
    }
    const URL = `${CONFIG.Mssgae_URL}/users/${CONFIG.accountId}/messages`;
    await axios({
      url: URL,
      method: "post",
      headers: { "content-type": "application/json" },
      auth: {
        username: CONFIG.apiToken,
        password: CONFIG.apiSecret,
      },
      data: sendData,
    })
      .then(async (res) => {
        if (res && res.statusText === "Accepted" && res.status === 202) {
          let sendMsgData = null;
          if (res.data.media) {
            sendMsgData = {
              from_number: data.fromNumber,
              to_number: data.toNumber,
              text: data.text,
              direction: "out",
              message_id: res.data.id,
              sender: data.sender,
              media: res.data.media[0],
              account_name: data.accountName,
            };
          } else {
            sendMsgData = {
              from_number: data.fromNumber,
              to_number: data.toNumber,
              text: data.text,
              direction: "out",
              message_id: res.data.id,
              sender: data.sender,
              account_name: data.accountName,
            };
          }

          if (data.scheduleData) {
            let msgData = {
              to_number: data.toNumber,
              from_number: data.scheduleData.from_number,
              text: data.scheduleData.text,
              sender: data.scheduleData.sender,
              tab: data.scheduleData.tab,
              schedule_time: data.scheduleData.schedule_time,
              account_name: data.scheduleData.account_name,
            };
            axios.post(`${CONFIG.serverURL}/createconversation`, {
              number1: data.scheduleData.from_number,
              number2: data.toNumber,
            });
            ScheduleMessage.create(msgData, function (err2, res2) {
              if (err2) {
                return;
              } else {
                result.sendStatus(200);
              }
            });
          } else {
            await axios
              .post(`${CONFIG.serverURL}/sendmessage`, {
                sendMsgData,
              })
              .then((res1) => {
                result.send(res1.data);
              });
          }
        }
      })
      .catch((error) => {
        console.log(error);
        result.status(error.response.status).json({ message: error.message });
      });
  });

  app.post("/createconversation", async function (req, res) {
    const { number1, number2 } = req.body;
    await Conversation.findOne(
      {
        $or: [
          {
            number1: number1,
            number2: number2,
          },
          {
            number1: number2,
            number2: number1,
          },
        ],
      },
      function (err, result) {
        if (result) {
          Conversation.findOneAndUpdate(
            {
              _id: result._id,
            },
            {
              $set: {
                updatedAt: new Date(),
              },
            },
            function (uperr, upres) {
              if (uperr) {
                return uperr;
              }
            }
          );
        } else {
          const saveData = {
            number1: number1,
            number2: number2,
          };
          Conversation.create(saveData, function (err1, res1) {
            if (err1) {
              return;
            }
            return res.sendStatus(200);
          });
        }
      }
    );
  });

  app.post("/sendmessage", function (req, res) {
    const { from_number, to_number } = req.body.sendMsgData;
    axios.post(`${CONFIG.serverURL}/createconversation`, {
      number1: from_number,
      number2: to_number,
    });
    Message.create(req.body.sendMsgData, function (err, resu) {
      if (err) {
        res.send(err);
        return;
      }
      res.sendStatus(200);
    });
  });

  app.post("/fileupload", (req, res, next) => {
    let imageFile = req.files.file;
    let extention = path.extname(req.files.file.name);
    var filename = crypto.randomBytes(15).toString("hex");
    imageFile.mv(
      `${__dirname}/../public/mms_images/${filename}${extention}`,
      function (err) {
        if (err) {
          return res.status(500).send(err);
        }
        res.json({ file: `${filename}${extention}` });
      }
    );
  });
  app.post("/uploadavatar", (req, res) => {
    let imageFile = req.files.file;
    let userId = req.body.userId;
    let extention = path.extname(req.files.file.name);
    let filename = crypto.randomBytes(15).toString("hex");
    imageFile.mv(
      `${__dirname}/../public/users/${filename}${extention}`,
      function (err) {
        if (err) {
          return res.status(500).send(err);
        }
        User.findOneAndUpdate(
          {
            userId: userId,
          },
          { $set: { avatar: `${filename}${extention}` } },
          { upsert: true },
          function (err, result) {
            if (err) {
              return err;
            } else {
              res.send(result);
            }
          }
        );
      }
    );
  });
  app.post("/sendcontact", (req, res, next) => {
    const email = {
      from: req.body.fromMail,
      to: req.body.toMail,
      subject: req.body.subject,
      html: req.body.text,
    };

    transport.sendMail(email, function (err, info) {
      if (err) {
        console.log("error");
      } else {
        res.send("Message sent: " + info.response);
      }
    });
  });
  app.post("/deleteconversation", (req, res) => {
    const { fromNumber, toNumber } = req.body.msgData;
    Conversation.deleteMany(
      {
        $or: [
          { number1: fromNumber, number2: toNumber },
          { number1: toNumber, number2: fromNumber },
        ],
      },
      function (err, result) {
        if (err) {
          return;
        }
      }
    );
    Message.updateMany(
      {
        $or: [
          { from_number: fromNumber, to_number: toNumber },
          { from_number: toNumber, to_number: fromNumber },
        ],
        trash_flag: false,
      },
      { $set: { trash_flag: true } },
      { upsert: true },
      function (err, resu) {
        if (!resu) {
          console.log(err);
        } else {
          res.send(resu);
        }
      }
    );
  });

  app.post("/getusers", function (req, res) {
    const { accountId } = req.body;
    User.find(
      {
        account_id: accountId,
      },
      function (err, result) {
        if (!err) res.send(result);
      }
    );
  });

  app.post("/deletecontact", async function (req, res) {
    const { id } = req.body;
    Contact.deleteMany(
      {
        _id: id,
      },
      async function (err, result) {
        if (err) {
          console.log("err", err);
          return;
        } else {
          console.log(result, "result");
          const beforeDel = await DistributionContact.find({
            _id: id,
          });
          console.log(beforeDel, " in database");
          const response = await DistributionContact.deleteMany({
            _id: id,
          });
          console.log(response, "response from dis");
          const myRes = await DistributionContact.find({
            _id: id,
          });

          console.log(myRes, "still in database");
          res.send(response);
        }
      }
    );
  });

  app.post("/getcontacts", function (req, res) {
    const { userId } = req.body;
    Contact.find(
      {
        userID: userId,
      },
      function (err, result) {
        if (err) {
          console.log(err);
        } else {
          res.send(result);
        }
      }
    );
  });

  app.post("/getcontactsById", function (req, res) {
    const { contactId } = req.body;
    Contact.findOne(
      {
        _id: contactId,
      },
      function (err, result) {
        if (err) {
          console.log(err);
        } else {
          res.send(result);
        }
      }
    );
  });
};
