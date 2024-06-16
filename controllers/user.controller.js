import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url';
import fs from 'fs'
import { dirname } from 'path';
import { v4 as uuid } from 'uuid';
import dotenv from 'dotenv'
import { v2 as cloudinary } from "cloudinary";
import { Readable } from 'stream';
dotenv.config()


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import User from "../models/user.model.js"
import { generateTokenAndSetCookie } from '../lib/utils/generateToken.js';
import { DiffieHellmanGroup } from 'crypto';


export const register = async(req, res) => {
    try {
        const {name, email, password, confirmPassword} = req.body

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 
        if(!email || !name || !password) {
            return res.status(422).json({message: "Please fill all the fields"})
        }

        if(!emailRegex.test(email)) {
            return res.status(422).json({error: "Invalid Email format"})
        }

        const newEmail = email.toLowerCase()

        const emailExists = await User.findOne({email: newEmail})

        if(emailExists) {
            return res.status(422).json({error: "Email already exists"})
        }

        if(password.trim().length < 6) {
            return res.status(422).json({ error: "Password must be at least 6 characters long" });
        }

        if(password != confirmPassword) {
            return res.status(422).json({ error: "Password do not match" });
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = await User.create({
            name,
            email: newEmail,
            password: hashedPassword
        })

        res.status(201).json(`New user ${newUser.email} registered successfully`)

    } catch (error) {
        console.log("Error in register controller", error.message)
        res.status(500).json({error: "Internal server error"})
    }
}

export const login = async(req, res) => {
    try {
        const {email, password} = req.body
        if(!email || !password) {
            return res.status(422).json({message: "Please fill all the fields"})
        }

        const newEmail = email.toLowerCase()
        const user = await User.findOne({email: newEmail})
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "")
 
        if(!user || !isPasswordCorrect) {
            return res.status(422).json({ error: "Invalid username or password" });
        }

        generateTokenAndSetCookie(user._id, res)

        user.password = null

        res.status(200).json(user);

    } catch (error) {
        console.log("Error in login controller", error.message)
        res.status(500).json({error: "Internal server error"})
    }
}

export const getProfile = async(req, res) => {
    try {
        const {id} = req.params

        const user = await User.findById(id).select("-password")

        if(!user) {
            res.status(404).json({error: "User not found"})
        }

        res.status(200).json(user)
    } catch (error) {
        console.log("Error in getProfile controller", error.message)
        res.status(500).json({error: "Internal server error"})
    }
}

export const changeAvatar = async(req, res) => {
    try {
        if(!req.files.avatar) {
            return res.status(422).json({error: "Please choose an image"})
        }

        const user = await User.findById(req.user.id)

        //delete old avatar if exists
        if(user.avatar && user.avatar.public_id) {
            await cloudinary.uploader.destroy(user.avatar.public_id, { invalidate: true });
        }

        const {avatar} = req.files

        //check file size
        if(avatar.size > 500000) {
            return res.status(422).json({error: "Profile picture too big. Should be less than 500kb"})
        }
        

        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            async (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ error: "An error occurred during file upload" });
                }

                try {
                    const updatedAvatar = await User.findByIdAndUpdate(
                        req.user.id,
                        { avatar: { url: result.secure_url, public_id: result.public_id } },
                        { new: true }
                    );

                    if (!updatedAvatar) {
                        return res.status(422).json({ error: "Avatar couldn't be changed." });
                    }

                    res.status(200).json(updatedAvatar);
                } catch (dbError) {
                    console.error(dbError);
                    res.status(500).json({ error: "An error occurred while creating the post" });
                }
            }
        );

        const readableStream = new Readable();
        readableStream.push(avatar.data);
        readableStream.push(null);
        readableStream.pipe(stream);

    } catch (error) {
        console.log("Error in changeAvatar controller", error.message)
        res.status(500).json({error: "Internal server error"})
    }
}

export const editUser = async (req, res) => {
    try {
        const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body;

        // Check if all required fields are provided
        if (!name || !email || !currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(422).json({ message: "Please fill all the fields" });
        }

        // Get user from database
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(403).json({ error: "User not found." });
        }

        // Check if email already exists (excluding the current user)
        const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (emailExists) {
            return res.status(422).json({ error: "Email already exists." });
        }

        // Validate current password
        const validatePassword = await bcrypt.compare(currentPassword, user.password);
        if (!validatePassword) {
            return res.status(422).json({ error: "Invalid current password" });
        }

        // Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            return res.status(422).json({ error: "New passwords do not match" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user information
        const updatedUser = await User.findByIdAndUpdate(req.user._id, { name, email, password: hashedPassword }, { new: true });

        // Send the updated user information in the response
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error in editUser controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};