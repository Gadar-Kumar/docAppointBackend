import jwt from "jsonwebtoken";
import 'dotenv/config'



// admin auth middleware
const authAdmin=async(req,res,next)=>{
    try {
        const {token}=req.headers
        if(!token){
            return res.status(401).json({success:false,message:"Unauthorized access"})
        }
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        if(decoded.email!==process.env.ADMIN_EMAIL||decoded.password!==process.env.ADMIN_PASSWORD){
            return res.status(401).json({success:false,message:"Unauthorized access"})
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false,message:"Internal server error"})
    }
}

export default authAdmin;