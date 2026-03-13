const express = require('express');
const router = express.Router();
const userRouter = require('../controllers/UserController');

router.get('/profile/:id', userRouter.profile);
router.get('/list-customer', userRouter.listCustomer);
router.put("/change-password", userRouter.changePassword);
router.post("/send-mail", userRouter.sendMail);
router.patch('/:id/ban', userRouter.banUser);
router.patch('/:id/unban', userRouter.unbanUser);
router.delete("/delete-customer/:id", userRouter.deleteCustomer);

module.exports = router;
