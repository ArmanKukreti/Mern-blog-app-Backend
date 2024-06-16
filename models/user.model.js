import mongoose, { model } from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        public_id: {
            type: String
        },
        url: {
            type: String
        }
    },
    posts: {
        type: Number,
        default: 0
    }
}, {timestamps: true})

const User = mongoose.model('User', userSchema)

export default User