// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

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


        app.get('/parcels', async (req, res) => {
            const result = await parcelsCollection.find().toArray();
            res.send(result);
        });

        // for my parcel data & admins data 
        app.get('/parcels', async (req, res) => {
            const email = req.query.email;

            const query = email ? { created_by: email } : {};
            const result = await parcelsCollection
                .find(query)
                .sort({ creation_date: -1 })
                .toArray();

            res.send(result);
        });



        app.post('/parcels', async (req, res) => {
            const parcel = req.body;
            const result = await parcelsCollection.insertOne(parcel);
            res.send(result);
        });


        app.delete('/parcels/:id', async (req, res) => {
            const id = req.params.id;
            const result = await parcelsCollection.deleteOne({ _id: new ObjectId(id) });

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
