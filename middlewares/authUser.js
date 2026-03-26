import jwt from "jsonwebtoken";
import 'dotenv/config'



// admin auth middleware
const authUser=async(req,res,next)=>{
    try {
        const {utoken}=req.headers
        if(!utoken){
            return res.status(401).json({success:false,message:"Unauthorized access"})
        }
        const decoded=jwt.verify(utoken,process.env.JWT_SECRET)
       req.userId = decoded.id;   // ✅ safe

        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false,message:"Internal server error"})
    }
}

export default authUser;