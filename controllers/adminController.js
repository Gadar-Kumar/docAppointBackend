import validator from "validator";
import bcrypt from 'bcrypt'
import {v2 as cloudinary} from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import 'dotenv/config'
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";



// api for adding doctor
const addDoctor=async(req,res)=>{
    try {
        // console.log(req.body);
        // console.log(req.body.address);
        
        
        const {name,email,password,speciality,about,degree,fees,address,experience}=req.body
        const imageFile=req.file
       
        // checking for all data
        if(!name || !email || !password || !about || !speciality || !degree || !fees || !address || !experience || !imageFile){
            return res.status(400).json({success:false,message:"All fields are required"})
        }
            // email validation
        if(!validator.isEmail(email)){
            return res.status(400).json({success:false,message:"Please enter a valid email"})
        }
        // password length validation
        if(password.length<8){
            return res.status(400).json({success:false,message:"Password must be at least 8 characters"})
        }

        // password hasing
        const salt=await bcrypt.genSalt(10)
        const hasedPassword=await bcrypt.hash(password,salt)
       
        // upload image to cloudinary
        const imageUpload=await cloudinary.uploader.upload(imageFile.path,{
            resource_type:"image"
        })
        // getting image url from cloudinary
        const imageUrl=imageUpload.secure_url
       

        const doctorData={
            name,
            email,
            password:hasedPassword,
            speciality,
            degree,
            about,
            fees:Number(fees),
            address:JSON.parse(address),
            experience,
            image:imageUrl,
            date:Date.now(),
        }
        // saving doctor data to database
        const newDoctor=new doctorModel(doctorData)
        await newDoctor.save()

        res.json({success:true,message:"Doctor added successfully"})

    } catch (error) {
        console.log(error);
        
        return res.status(500).json({success:false,message:"Internal server error"})
    }
}

// api for admin login

const loginAdmin=async(req,res)=>{
    try {
        const {email,password}=req.body;

        if(email===process.env.ADMIN_EMAIL && password===process.env.ADMIN_PASSWORD){
            const token=jwt.sign({email,password},process.env.JWT_SECRET,{expiresIn:"1d"})

           return res.status(200).json({success:true,message:"Admin logged in successfully",token})
        }else{
            return res.json({success:false,message:"Invalid admin credentials"})
        }
    } catch (error) {
        console.log(error);
        return res.json({success:false,message:"Internal server error"});
    }
}

// api to get all doctor list for admin pannel

const allDoctor=async(req,res)=>{
    try {
        const doctors=await doctorModel.find({}).select('-password') //give all doctor data except password
        res.json({success:true,doctors})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
        
    }
}
// api to get all apointment lis
const appointentAdmin=async(req,res)=>{
    try {
        const appointments=await appointmentModel.find({})
        res.json({success:true,appointments})
    } catch (error) {
         console.log(error);
        res.json({success:false,message:error.message})
    }
}
// api for appointment cancelletion
const appointmentCancel=async(req,res)=>{
    try {
       
        
      
        const {appointmentId}=req.body
        //  console.log("appointmentId: ",appointmentId);
        //  console.log("userId: ",userId);
         
        const appointmentData=await appointmentModel.findById(appointmentId)

        await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})
        // releasing doctor slot
        const {docId,slotDate,slotTime}=appointmentData

        const doctorData=await doctorModel.findById(docId)

        let slots_booked=doctorData.slots_booked
        slots_booked[slotDate]=slots_booked[slotDate].filter(e=>e!==slotTime)
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json({success:true,message:'appointment cancelled'})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:"Internal server issue"})
    }
}

// api to get dashboard data for admin pannel

const adminDashboard=async(req,res)=>{
    try {
        const doctors=await doctorModel.find({})
        const users=await userModel.find({})
        const appointments=await appointmentModel.find({})

        const dashData={
            doctors:doctors.length,
            appointments:appointments.length,
            patients:users.length,
            latestAppointments: appointments.reverse().slice(0,5)
        }

        res.json({success:true,dashData})

    } catch (error) {
        console.log(error);
        res.json({success:false,message:"Internal server issue"})
    }
}

export {addDoctor,loginAdmin,allDoctor,appointentAdmin,appointmentCancel,adminDashboard}