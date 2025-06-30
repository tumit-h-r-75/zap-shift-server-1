// server.js
const express = require ('express');
const cors = require ('cors');
const dotenv = require ('dotenv');
const { MongoClient, ObjectId, ServerApiVersion } = require ('mongodb');
const admin = require ('firebase-admin');
const serviceAccount = require ('./zap-shift-application-firebase-admin.json')



dotenv.config();

// payment
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Stripe = require ('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// 

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());


// firebase admin code........................................................... 



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// .....................................................................................

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
        const paymentsCollection = client.db("zapshiftDB").collection("payments");
        const trackingCollection = client.db("zapshiftDB").collection("tracking");
        const usersCollection = client.db("zapshiftDB").collection("user");


        // custom middleware for jwt
        const verifyFBToken = async (req, res, next) => {
            // console.log('header in the middleware',req.headers);
            const authHeader = req.headers.authorization ;
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            // verify the token
            try {
                const decoded = await admin.auth().verifyIdToken(token);
                req.decoded = decoded;

                next()
            }
            catch (error) {
                return res.status(403).send({ message: 'forbidden access' })
            }

        }




        app.get('/parcels',verifyFBToken, async (req, res) => {
            const result = await parcelsCollection.find().toArray();
            res.send(result);
        });


        // for getting data by id
        app.get('/parcels/:id',verifyFBToken, async (req, res) => {
            const id = req.params.id;
            const parcel = await parcelsCollection.findOne({ _id: new ObjectId(id) });
            res.send(parcel);
        });

        // for my parcel data & admins data 
        app.get('/parcels',verifyFBToken, async (req, res) => {
            const email = req.query.email;

            const query = email ? { created_by: email } : {};
            const result = await parcelsCollection
                .find(query)
                .sort({ creation_date: -1 })
                .toArray();

            res.send(result);
        });


        // for admin seeing the all payment history
        app.get("/all-payments",verifyFBToken, async (req, res) => {
            const result = await paymentsCollection
                .find()
                .sort({ date: -1 })
                .toArray();

            res.send(result);
        });



        // for user payment history seen
        app.get("/my-payments/:email", verifyFBToken, async (req, res) => {
            console.log('headers in payments ', req.headers);
            const email = req.params.email;
            

            if(req.decoded.email!==email){
                return res.status(403).send({ message: 'forbidden access' })
            }
            
            const result = await paymentsCollection
                .find({ email })
                .sort({ date: -1 })
                .toArray();

            res.send(result);
        });




        app.post('/parcels',verifyFBToken, async (req, res) => {
            const parcel = req.body;
            const result = await parcelsCollection.insertOne(parcel);
            res.send(result);
        });

        // for payment realted apis 
        app.post("/create-payment-intent", async (req, res) => {
            const amount = req.body.amount;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100, // stripe এর amount cent এ হয়
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({ clientSecret: paymentIntent.client_secret });
        });



        // for payment history + parcel data update 
        app.post("/save-payment",verifyFBToken, async (req, res) => {
            const { transactionId, amount, email, parcelId, date } = req.body;

            // save the payment history
            const payment = {
                transactionId,
                amount,
                email,
                parcelId,
                date, // ex: new Date()
            };
            const paymentResult = await paymentsCollection.insertOne(payment);

            // update the payment stutas
            const parcelResult = await parcelsCollection.updateOne(
                { _id: new ObjectId(parcelId) },
                { $set: { Payment_status: "paid" } }
            );

            res.send({ paymentResult, parcelResult });
        });

        // for tracking related apis 
        app.post("/tracking", async (req, res) => {
            const { trackingId, status, date, location, note } = req.body;

            const newTracking = {
                trackingId,
                status,
                date: new Date(date),
                location,
                note
            };

            const result = await trackingCollection.insertOne(newTracking);
            res.send(result);
        });

        // user related apis
        app.post('/users', async (req, res) => {
            const email = req.body.email
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                const updateRes = await usersCollection.updateOne(
                    { email },
                    {
                        $set: {
                            last_log_In: new Date().toISOString()
                        }
                    }
                );
                return res.status(200).send({ message: 'User already exists. Last login updated.', inserted: false, updated: true });
            }
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })




        app.delete('/parcels/:id',verifyFBToken, async (req, res) => {
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
