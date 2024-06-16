import express from "express";
import { changeAvatar, editUser, getProfile, login, register } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router()

router.get('/:id', getProfile)
router.post('/register', register)
router.post('/login', login)
router.post('/change-avatar', protectRoute, changeAvatar)
router.patch('/edit', protectRoute, editUser)


export default router