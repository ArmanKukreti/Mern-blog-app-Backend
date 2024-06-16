import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ["General inquires", "Blog Posting", "New listing", "Advertisement", "Business proposal", "Other topic"]
    },
    query: {
        type: String,
        required: true,
    },
    attachment: {
        url: {
            type: String,
        },
        public_id: {
            type: String,
        }
    }
})

const Contact = mongoose.model('Contact', contactSchema)

export default Contact