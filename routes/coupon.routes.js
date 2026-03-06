import express from 'express';
import couponController from '../controllers/coupon.controller.js';

const couponRouter = express.Router();

couponRouter.get('/validate', couponController.validate);

export default couponRouter;
