import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudaniry.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';


// app config

const app=express();
const port=process.env.PORT || 9000;
connectDB()
connectCloudinary()

// middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// api endpoints
app.use('/api/admin',adminRouter)
app.use('/api/doctor',doctorRouter)
app.use('/api/user',userRouter)
app.get('/',(req,res)=>{
    res.status(200).send('hello world from backen')
})

app.listen(port,()=>{
    console.log(`listening on localhost:${port}`)
})