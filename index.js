const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());



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
    const classCollection = client.db("fitcraftDb").collection("classes");
    const instructorsCollection = client.db("fitcraftDb").collection("instructors");
    const cartsCollection = client.db("fitcraftDb").collection("carts");


    //users related api
    app.get('/users', async (req, res) => {
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


    app.get('/classes',async (req,res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })
    app.get('/instructors',async (req,res) =>{
        const result = await instructorsCollection.find().toArray();
        res.send(result);
    })

    //cart collection apis

    app.get('/carts', async(req,res) => {
      const email = req.query.email;
      console.log(email)
      if(!email){
        res.send([]);
      }
      const query = {email :email};
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    })

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