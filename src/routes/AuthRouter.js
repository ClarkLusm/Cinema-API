"use strict";

const express = require('express')
const router = express.Router()

const AuthRouter = require('../controllers/AuthController');

router.post("/register", AuthRouter.register);
router.post("/login", AuthRouter.login);
router.post("/activate-account", AuthRouter.activateAccount);
router.post("/resend-activation", AuthRouter.resendActivation);
router.post("/forgot-password", AuthRouter.forgotPassword);
router.post("/reset-password", AuthRouter.resetPassword);


module.exports = router;