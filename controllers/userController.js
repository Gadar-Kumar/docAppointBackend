import bcrypt, { hash } from 'bcrypt'
import validator from 'validator'
import userModel from '../models/userModel.js'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import { json } from 'express'
import {v2 as cloudaniry} from 'cloudinary'
import doctorModel from '../models/doctorModel.js'
import appointmentModel from '../models/appointmentModel.js'
import razorpay from 'razorpay'



// api to sign up user
const registerUser=async(req,res)=>{
    try {
        const {name,email,password}=req.body

        if(!name || !email || !password){
            return res.json({success:false,message:"All field required"})
        }
        // validating password and email formate
        if(!validator.isEmail(email)){
            return res.json({success:false,message:"Enter a valid email"})
        }
        if(password.length<8){
             return res.json({success:false,message:"Enater a strong password"})
        }
        // hasing user password
        const salt=await bcrypt.genSalt(10)
        const hashedPassword=await hash(password,salt);

        const userData={
            name,
            email,
            password:hashedPassword
        }

        const newUser=new userModel(userData)
        const user=await newUser.save()
        // -id
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET)

        res.json({success:true,token})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
        
    }
}

// login user
const loginUser=async(req,res)=>{
    try {
        const {email,password}=req.body
        const user=await userModel.findOne({email})

        if(!user){
            return res.json({success:false,message:"User not exist"})
        }

       const isMatch=await bcrypt.compare(password,user.password)
       if(isMatch){
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET)
        res.json({success:true,token})
       }else{
        res.json({success:false,message:"Invalid password"})
       }

    } catch (error) {
         console.log(error);
        res.json({success:false,message:error.message})
    }
}

// api to get user data
const getProfile=async(req,res)=>{
    try {
        const userId=req.userId
        const userData=await userModel.findById(userId).select('-password')
        res.json({success:true,userData})
    } catch (error) {
         console.log(error);
        res.json({success:false,message:"not error"})
    }
}
// updating user profile
const updateProfile=async(req,res)=>{
    try {
        console.log(req.body);
        
        const {name,phone,address,dob,gender}=req.body
        const userId=req.userId
        const imageFile=req.file
        console.log(imageFile);
        
         if(!name || !phone || !dob ){
             return res.json({success:false,message:"Data Missing"})

         }

        await userModel.findByIdAndUpdate(userId,{name,phone,address:JSON.parse(address),dob,gender})

        if(imageFile){
            // upload image to cloudaniry
            const imageUpload=await cloudaniry.uploader.upload(imageFile.path,{resource_type:'image'})
            // getting cloudaniry image url
            const imageUrl=imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId,{image:imageUrl})
        }

        res.json({success:true,message:'Profile Updated'})


    } catch (error) {
         console.log(error);
        res.json({success:false,message:error.message})
    }
}

// book appointment
const bookAppointment=async(req,res)=>{
    try {
        const userId=req.userId
        const {docId,slotDate,slotTime}=req.body

        const docData=await doctorModel.findById(docId).select('-password')

        if(!docData.available){
            return res.json({success:false,message:"Doctor not available"})
        }

        let slots_booked=docData.slots_booked

        // checkin for slots availability

        if(slots_booked[slotDate]){
            if(slots_booked[slotDate].includes(slotTime)){
            return res.json({success:false,message:"Slot not available"})
            }else{
                slots_booked[slotDate].push(slotTime)
            }
        }else{
            slots_booked[slotDate]=[]
            slots_booked[slotDate].push(slotTime)
        }

        const userData=await userModel.findById(userId).select('-password')
        delete docData.slots_booked

        const appointmentData={
            userId,
            docId,
            userData,
            docData,
            amount:docData.fees,
            slotDate,
            slotTime,
            date:Date.now()
        }

        const newAppointment=new appointmentModel(appointmentData)
        await newAppointment.save()

         // save new slots data in doctors data
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json({success:true,message:"Appointment booked successfully"})

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
        
    }

// Api to get my-Appointment page
const listAppointment=async(req,res)=>{
   try {
     const userId=req.userId
     const appointments=await appointmentModel.find({userId})

     res.json({success:true,appointments})
   } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
   }

}

// api to cancle appointment

const cancelAppointment=async(req,res)=>{
    try {
       
        
        const userId=req.userId
        const {appointmentId}=req.body
        //  console.log("appointmentId: ",appointmentId);
        //  console.log("userId: ",userId);
         
        const appointmentData=await appointmentModel.findById(appointmentId)

        // verify appointment user
        if(appointmentData.userId!==userId){
            return res.json({success:false,message:'unauthorized access'})        
        }

        console.log('appointment.userId',appointmentData.userId);
        
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
//   console.log(process.env.RAZORPAY_KEY_ID);
const razorpayInstance=new razorpay({
  
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
})

// api to make payment of appointment using razor pay
const paymentRazorpay=async(req,res)=>{
       try {
         const {appointmentId}=req.body
         const appointmentData=await appointmentModel.findById(appointmentId)
 
         if(!appointmentData || appointmentData.cancelled){
             return res.json({success:false,message:"Appointment Cancelled or not Found"})
         }
         // creating options for razorpay payment
         const options={
             amount:appointmentData.amount*100,
             currency:process.env.CURRENCY,
             receipt:appointmentId
         }
 
         // creation of an order
         const order=await razorpayInstance.orders.create(options)
         res.json({success:true,order})
       } catch (error) {
        console.log(error);
        res.json({success:false,message:"Internal server problem in gateway payment"})
       }
}

// api to verify payment of razorpay
const verifyRazorpay=async(req,res)=>{
    try {
        const {razorpay_order_id}=req.body;
        const orderInfo=await razorpayInstance.orders.fetch(razorpay_order_id)
        console.log(orderInfo);

        if(orderInfo.status==='paid'){
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt,{payment:true})
            res.json({success:true,message:"Payment success"})
        }
        
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
        
    }
}

export {registerUser,loginUser,getProfile,updateProfile,bookAppointment,listAppointment,cancelAppointment,paymentRazorpay,verifyRazorpay}