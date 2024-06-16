import express from "express";
import { postContactData } from "../controllers/contact.controller.js";

const router = express.Router()

router.post('/', postContactData)

export default router