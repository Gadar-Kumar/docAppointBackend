import jwt from "jsonwebtoken";
import 'dotenv/config'



// doctor auth middleware
const authDoctor=async(req,res,next)=>{
    try {
        const {dtoken}=req.headers
        if(!dtoken){
            return res.status(401).json({success:false,message:"Unauthorized access"})
        }
        const decoded=jwt.verify(dtoken,process.env.JWT_SECRET)
        // console.log(decoded.id);
        
       req.docId = decoded.id;   // ✅ safe

        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false,message:"Internal server error"})
    }
}

export default authDoctor;