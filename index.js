const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// USE MIDDLEWARE

app.use(cors());
app.use(express.json());

// FIREBASE Service Account

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// CONNECT WITH MONGODB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2xoju.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyJwtToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const jwt = req.headers.authorization.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(jwt);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }

  next();
}

async function run() {
  try {
    client.connect();
    const database = client.db(`${process.env.DB_NAME}`);
    const courseCollection = database.collection('courses');
    const reviewCollection = database.collection('reviews');
    const orderCollection = database.collection('orders');
    const userCollection = database.collection('users');

    /* 
    
                                                   GET APIS
    
    */

    // GET ADMIN OR NOT?

    app.get('/user/:email', async (req, res) => {
      const query = { email: req.params.email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'Admin') {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // GET ALL COURSES

    app.get('/all-courses', async (req, res) => {
      const cursor = courseCollection.find({});
      const courses = await cursor.toArray();
      res.json(courses);
    });

    // GET A SINGLE COURSE

    app.get('/course/:id', async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      const course = await courseCollection.findOne(query);
      res.json(course);
    });

    // GET SINGLE USERS

    app.get('/normal-users/:email', async (req, res) => {
      const cursor = await userCollection.findOne({ email: req.params.email });
      res.json(cursor);
    });

    // GET ALL USERS

    app.get('/all-users', verifyJwtToken, async (req, res) => {});

    /* 
    
                                                   POST APIS
    
    */

    // POST A USER

    app.post('/user', async (req, res) => {
      const result = await userCollection.insertOne(req.body);
      res.json(result);
    });

    // POST A SINGLE COURSES

    app.post('/add-course', async (req, res) => {
      const result = await courseCollection.insertOne(req.body);
      res.json(result);
    });

    // POST A SINGLE ORDER

    app.post('/add-order', async (req, res) => {
      const result = await orderCollection.insertOne(req.body);
      res.json(result);
    });

    /* 
    
                                                   DELETE APIS
    
    */

    /* 
    
                                                   UPDATE APIS
    
    */

    // PUT admin & check with JWT Token  he/she is admin or not ?

    app.put('/user/admin', verifyJwtToken, async (req, res) => {
      const newAdmin = req.body;
      const email = req.decodedEmail;
      if (email) {
        const requester = await userCollection.findOne({ email });
        if (requester.role === 'Admin') {
          const filter = { email: newAdmin.email };
          const updateUser = { $set: { role: 'Admin' } };
          const result = await userCollection.updateOne(filter, updateUser);
          res.json(result);
        }
      } else {
        req.status(401).json({ message: 'You do not have access to make admin' });
      }
    });
  } finally {
    // client.close()
  }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send('Welcome to pathshala Server API'));
app.listen(port, () => console.log(`Server Running on localhost:${port}`));
