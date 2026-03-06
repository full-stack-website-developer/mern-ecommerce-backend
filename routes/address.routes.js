import express from 'express';
import addressController from '../controllers/address.controller.js';

const addressRouter = express.Router();

addressRouter.get('/:userId', addressController.getUserAddresses);

export default addressRouter;