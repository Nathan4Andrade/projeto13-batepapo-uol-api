import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient
  .connect()
  .then(() => (db = mongoClient.db()))
  .catch((err) => console.log(err.message));

app.post("/participants", (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(422).send("Todos os campos são obrigatórios!");
    return;
  }

  const newParticipant = {
    name,
    lastStatus: Date.now(),
  };

  db.collection("participants")
    .insertOne(newParticipant)
    .then(() => res.sendStatus(201))
    .catch(() => res.sendStatus(500));

  const newMessage = {
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };

  db.collection("messages")
    .insertOne(newMessage)
    .then(() => res.sendStatus(201))
    .catch(() => res.sendStatus(500));
});

app.get("/participants", (req, res) => {});

app.post("/messages", (req, res) => {});

app.get("/messages", (req, res) => {});

app.post("/status", (req, res) => {});

const PORT = 5000;
app.listen(PORT, () => console.log(`Running server on port ${PORT}`));
