import Contact from "../models/contact.model.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { v2 as cloudinary } from "cloudinary";
import { Readable } from 'stream';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

const uploadToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) {
                resolve(result);
            } else {
                reject(error);
            }
        });

        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);
        readableStream.pipe(stream);
    });
};

export const postContactData = async (req, res) => {
    try {
        const { name, email, phone, category, query } = req.body;

        if (!name || !email || !phone || !category) {
            return res.status(422).json({ error: "Fill all the fields." });
        }

        if (phone.length < 10) {
            return res.status(422).json({ error: "Please enter valid phone number" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(422).json({ error: "Invalid Email format" });
        }

        const newEmail = email.toLowerCase();

        let attachmentUrl = null;
        let attachmentPublicId = null;
        if (req.files && req.files.attachment) {
            const { attachment } = req.files;

            if (attachment.size > 2000000) {
                return res.status(422).json({ error: "Attachment should be less than 2mb" });
            }

            try {
                const result = await uploadToCloudinary(attachment.data, { resource_type: "auto" });
                attachmentUrl = result.secure_url;
                attachmentPublicId = result.public_id;
            } catch (uploadError) {
                console.error(uploadError);
                return res.status(500).json({ error: "An error occurred during file upload" });
            }
        }

        const newContact = await Contact.create({
            name,
            email: newEmail,
            phone,
            category,
            query,
            attachment: {
                url: attachmentUrl,
                public_id: attachmentPublicId
            }
        });

        if (!newContact) {
            return res.status(422).json({ error: "Query couldn't be sent" });
        }

        // Sending email
        const mailOptions = {
            from: process.env.SMTP_MAIL,
            to: "ayushpkukreti@gmail.com",
            subject: "User query details from blog app",
            html: `<p>Name: ${name}</p><p>Email: ${newEmail}</p><p>Phone: ${phone}</p><p>Category: ${category}</p><p>Query: ${query}</p>`,
            ...(attachmentUrl && {
                attachments: [
                    {
                        filename: 'attachment.pdf', // Change this if you want the original filename
                        path: attachmentUrl
                    }
                ]
            })
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.log(error);
            } else {
                console.log("Email sent successfully");
            }
        });

        res.status(201).json(newContact);

    } catch (error) {
        console.log("Error in postContactData controller", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
