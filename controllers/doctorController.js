import doctorModel from '../models/doctorModel.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import appointmentModel from '../models/appointmentModel.js'



const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body
        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availability change' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })

    }
}

const doctorList = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select(['-password', '-email'])

        res.json({ success: true, doctors })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })

    }
}

// api for doctor login
const loginDoctor = async (req, res) => {
    try {
        const { email, password } = req.body

        const doctor = await doctorModel.findOne({ email })

        if (!doctor) {
            res.json({ success: false, message: "invalid credential" })
        }
        const isMatched = await bcrypt.compare(password, doctor.password)

        if (isMatched) {
            const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "invalid credential" })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// api to get doctor appointment for doctor pannel

const appointmentDoctor = async (req, res) => {
    try {
        const docId = req.docId
        // console.log(docId);

        const appointments = await appointmentModel.find({ docId })

        res.json({ success: true, appointments })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// api to mark appointment completed
const appointmentComplete = async (req, res) => {
    try {
        const docId = req.docId
        const { appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)

        if (appointmentData && appointmentData.docId === docId) {

            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
            res.json({ success: true, message: 'Appointment completed' })

        } else {
            res.json({ success: false, message: 'Mark failed' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// api to mark appointment cancelled
const appointmentCancel = async (req, res) => {
    try {
        const docId = req.docId
        const { appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)

        if (appointmentData && appointmentData.docId === docId) {

            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
            res.json({ success: true, message: 'Appointment completed' })

        } else {
            res.json({ success: false, message: 'Cancellation failed' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// api to get dashboardData for doctor pannel

const doctorDashboard = async (req, res) => {
    try {
        const docId = req.docId

        const appointments = await appointmentModel.find({ docId })
        let earning = 0

        appointments.map((item) => {
            if (item.isCompleted || item.paymet) {
                earning += item.amount
            }
        })

        let patients = []

        appointments.map((item) => {
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })

        const dashData = {
            earning,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse().slice(0, 5)
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// api to get doctor profile to doctor pannel

const doctorProfile = async (req, res) => {
    try {
        const docId = req.docId
        const profileData = await doctorModel.findById(docId).select('-password')
        
        res.json({ success: true, profileData })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// api to update profile data from Doctor Pannel

const updateDoctorProfile = async (req, res) => {
    try {
        const docId = req.docId
        //  console.log(docId);
        
        const { fees, address, available } = req.body
        // console.log(req.body);
        

        await doctorModel.findByIdAndUpdate(docId, { fees:fees, address, available },{new:true})
      
       
        res.json({ success: true, message: 'profile Updated' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

export { changeAvailability, doctorList, loginDoctor, appointmentDoctor, appointmentCancel, appointmentComplete, doctorDashboard,doctorProfile,updateDoctorProfile }