import express from "express";
import * as shopeeController from '../../app/controllers/api/shopee.controller';

const route = express.Router();

route.post('/', shopeeController.scrapping);

export default route;