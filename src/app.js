import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import Joi from "joi";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const currentTime = dayjs().format("HH:mm:ss");

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient
  .connect()
  .then(() => (db = mongoClient.db()))
  .catch((err) => console.log(err.message));

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const schemaParticipant = Joi.object({
    name: Joi.string().required(),
  });

  const validation = schemaParticipant.validate(req.body, {
    abortEarly: false,
  });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  if (!name) {
    res.status(422).send("Todos os campos são obrigatórios!");
    return;
  }

  try {
    const participant = await db
      .collection("participants")
      .findOne({ name: name });
    if (participant) return res.status(409).send("Esse nome já existe!");

    await db.collection("participants").insertOne({
      name,
      lastStatus: Date.now(),
    });

    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: currentTime,
    });
    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/messages", async (req, res) => {
  const user = req.headers.user;

  const participant = await db
    .collection("participants")
    .findOne({ name: user });
  if (!participant)
    return res.status(422).send("Esse usuário não existe ou foi desconectado!");

  const schemaMessage = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid("message", "private_message").required(),
  });

  const validation = schemaMessage.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  const message = {
    from: user,
    ...req.body,
    time: currentTime,
  };

  try {
    await db.collection("messages").insertOne(message);
    res.sendStatus(201);
  } catch (err) {
    res.sendStatus(422);
  }
});

app.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const { limit } = req.query;

  try {
    const messages = await db
      .collection("messages")
      .find({ $or: [{ to: "Todos" }, { to: user }, { from: user }] })
      .toArray();

    if (limit) {
      const limitSchema = Joi.number().min(1);
      const { error } = limitSchema.validate(limit);
      if (error) {
        return res.status(422).send(error.message);
      }
      return res.send(messages.slice(-limit));
    }

    res.send(messages);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/status", async (req, res) => {
  const { user } = req.headers;

  if (!user) return res.sendStatus(404);
  const participant = await db
    .collection("participants")
    .findOne({ name: user });
  if (!participant) return res.sendStatus(404);

  try {
    await db
      .collection("participants")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

async function removeInative() {
  const participants = await db.collection("participants").find().toArray();
  const time = dayjs().format("HH:mm:ss");
  console.log(participants);

  participants.forEach(async (participant) => {
    console.log(participant.lastStatus);
    console.log(Date.now());
    if (Date.now() - participant.lastStatus > 10000) {
      await db
        .collection("participants")
        .deleteOne({ _id: new ObjectId(participant._id) });
      await db.collection("messages").insertOne({
        from: participant.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: time,
      });
    }
  });
}

setInterval(removeInative, 15000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Running server on port ${PORT}`));

/* 

bla bla bla bla bla blal blalvlblsl lslaldkf sla dll lululu lalalalala cucucu; */
