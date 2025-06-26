// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI; //aitar modde mongodb ar user pass ase 

// Create MongoClient with options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect client once at startup
    await client.connect();


    const parcelsCollection = client.db("zapshiftDB").collection("parcels");


    app.post('/parcels', async (req, res) => {
      const parcel = req.body; 
      const result = await parcelsCollection.insertOne(parcel); 
      res.send(result); 
    });


    // Ping to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. Successfully connected to MongoDB!");
    
    // Start Express server only after DB connected
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();

// Basic route
app.get('/', (req, res) => {
  res.send('ZAPSHIFT Parcel Delivery Server is running!');
});
