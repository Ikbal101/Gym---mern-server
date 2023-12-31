const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }    
    req.decoded = decoded;
    next();
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tbnspgu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("fitcraftDb").collection("users");
    const classesCollection = client.db("fitcraftDb").collection("classes");
    const instructorsCollection = client.db("fitcraftDb").collection("instructors");
    const cartsCollection = client.db("fitcraftDb").collection("carts");
    const classCollection = client.db("fitcraftDb").collection("class");
    const paymentCollection = client.db("fitcraftDb").collection("payments");

    
    app.post('/jwt',(req,res) =>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res.send({token})
    })

        // Warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
          const email = req.decoded.email;
          const query = { email: email }
          const user = await usersCollection.findOne(query);
          if (user?.role !== 'admin') {
            return res.status(200).send({ error: true, message: 'forbidden message' });
          }
          next();
        }
        


    //users related api
    app.get('/users',verifyJWT,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.post('/users',async(req,res) =>{
      const user = req.body;
      const query = {email:user.email}
      const existingUser = await usersCollection.findOne(query);
      console.log('existing User',existingUser);
      if(existingUser){
        return res.send({message: 'User already exists'})
      }
     else{
      const result = await usersCollection.insertOne(user);
      res.send(result);
     }
    })

    app.patch('/users/admin/:id', async(req,res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId (id)}
      const updateDoc ={
        $set:{
          role:'admin'
        },
        
      };

      const result = await usersCollection.updateOne(filter,updateDoc);
      res.send(result)
    })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) { 
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    app.patch('/users/instructor/:id',async(req,res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId (id)}
      const updateDoc ={
        $set:{
          role:'instructor'
        },
        
      };

      const result = await usersCollection.updateOne(filter,updateDoc);
      res.send(result)
    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'instructor' }
      res.send(result);
    })

    app.get('/classes',async (req,res) =>{
        const result = await classesCollection.find().toArray();
        res.send(result);
    })
    
    app.get('/class',async (req,res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })

    app.post('/class',async(req,res)=>{
      const classItem = req.body;
      const result = await classCollection.insertOne(classItem);
      res.send(result)
    })

    app.delete('/class/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/instructors',async (req,res) =>{
        const result = await instructorsCollection.find().toArray();
        res.send(result);
    })

    //cart collection apis

    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
    
      if (!email) {
        res.send([]);
      }
    
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidd en access' })
      }
    
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts',async (req,res) => {
      const item =req.body;
      const result = await cartsCollection.insertOne(item);
      res.send(result);
    })

    //delete a item
app.delete('/carts/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await cartsCollection.deleteOne(query);
  res.send(result);
});

//delete a user
app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});

    // create payment intent
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

      // payment related api

      app.get('/payments', verifyJWT, async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const payments = await paymentCollection.find(query).toArray();
        res.send(payments);
      });
      
      app.post('/payments', verifyJWT, async (req, res) => {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);
  
        const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
        const deleteResult = await cartsCollection.deleteMany(query)
  
        res.send({ insertResult, deleteResult });
      })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Join Fitcraft Academy')
})

app.listen(port , ()=>{
    console.log(`Fitcraft is running on port ${port}`);
})